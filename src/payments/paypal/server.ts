import 'server-only';

import { NextResponse } from 'next/server';

import { triggerTransactionalEmailOutboxNow } from '@/fulfillment/email-outbox.server';
import { getServerEnv } from '@/lib/env/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { reportOperationalFailure } from '@/operations/monitoring';
import { createServerOrderAccess } from '@/order-access/server';
import { applyPaymentTransition } from '@/payments/transitions';
import type { PaymentInternalStatus, PaymentTransitionInput } from '@/payments/types';
import {
  createPayPalProcessor,
  type CapturePayPalOrderOutcome,
  type CreatePayPalOrderOutcome,
  type HandlePayPalWebhookOutcome,
  type PayPalOperationalFailure,
  type PayPalOrderAccess,
  type PayPalProcessor,
  type PayPalStore,
  type ReservationExtensionOutcome,
  type StoredPayPalOrder
} from './processor';

type QueryResult<T> = Promise<{ data: T; error: unknown }>;
type SelectBuilder<T> = {
  eq: (column: string, value: string) => SelectBuilder<T>;
  maybeSingle: () => QueryResult<T>;
};
type UpdateBuilder = {
  eq: (column: string, value: string) => UpdateBuilder & QueryResult<unknown>;
};
type TableBuilder<T> = {
  select: (columns: string) => SelectBuilder<T>;
  insert: (value: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  update: (value: Record<string, unknown>) => UpdateBuilder;
};
type AdminQueryClient = {
  from: <T = Record<string, unknown>>(table: string) => TableBuilder<T>;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

const ORDER_PAYMENT_STATUS_SELECT =
  'order_id,order_number,market,currency_code,total_minor,provider,payment_status,reservation_expires_at';
const PAYMENT_SELECT = 'id,order_id,provider_order_id,request_id,provider_request_id';

const VALID_PAYMENT_STATUSES = new Set<PaymentInternalStatus>([
  'pending',
  'verifying',
  'paid',
  'failed',
  'cancelled',
  'rejected',
  'expired',
  'review_required',
  'partially_refunded',
  'refunded'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asPaymentStatus(value: unknown): PaymentInternalStatus {
  return typeof value === 'string' && VALID_PAYMENT_STATUSES.has(value as PaymentInternalStatus)
    ? (value as PaymentInternalStatus)
    : 'verifying';
}

function requestIds(payment: Record<string, unknown>, orderId: string) {
  const createId =
    typeof payment.provider_request_id === 'string' && payment.provider_request_id
      ? payment.provider_request_id
      : orderId;
  const captureId =
    typeof payment.request_id === 'string' && payment.request_id ? payment.request_id : orderId;
  return { createId, captureId };
}

function mapStoredOrder(
  row: Record<string, unknown>,
  payment: Record<string, unknown>
): StoredPayPalOrder | null {
  if (
    typeof row.order_id !== 'string' ||
    typeof row.order_number !== 'string' ||
    typeof row.market !== 'string' ||
    typeof row.currency_code !== 'string' ||
    typeof row.provider !== 'string' ||
    typeof row.total_minor !== 'number' ||
    typeof payment.id !== 'string'
  ) {
    return null;
  }

  const { createId, captureId } = requestIds(payment, row.order_id);
  return {
    orderId: row.order_id,
    paymentId: payment.id,
    orderNumber: row.order_number,
    market: row.market,
    currencyCode: row.currency_code,
    provider: row.provider,
    paymentStatus: asPaymentStatus(row.payment_status),
    totalMinor: row.total_minor,
    reservationExpiresAt:
      typeof row.reservation_expires_at === 'string' ? row.reservation_expires_at : null,
    providerOrderId: typeof payment.provider_order_id === 'string' ? payment.provider_order_id : null,
    paypalCreateRequestId: createId,
    paypalCaptureRequestId: captureId
  };
}

function insertWebhookEventReceipt(
  client: AdminQueryClient,
  input: {
    paymentId: string;
    providerEventId: string;
    eventType: string;
    verificationStatus: 'verified' | 'rejected';
    payloadDigest: string;
    sanitizedFacts: Record<string, unknown>;
    receivedAt: string;
  }
) {
  return client.from('payment_events').insert({
    payment_id: input.paymentId,
    provider: 'paypal',
    provider_event_id: input.providerEventId,
    event_type: input.eventType,
    source: 'paypal_webhook',
    verification_status: input.verificationStatus,
    payload_digest: input.payloadDigest,
    sanitized_facts: input.sanitizedFacts,
    delivery_count: 1,
    last_received_at: input.receivedAt
  });
}

/**
 * Supabase persistence adapter behind the PayPal module's store seam.
 */
export function createSupabasePayPalStore(client: AdminQueryClient): PayPalStore {
  return {
    async findOrder(lookup) {
      if ('orderNumber' in lookup) {
        const { data: row, error: rowError } = await client
          .from('order_payment_statuses')
          .select(ORDER_PAYMENT_STATUS_SELECT)
          .eq('order_number', lookup.orderNumber)
          .maybeSingle();
        if (rowError || !isRecord(row) || typeof row.order_id !== 'string') {
          return null;
        }

        const { data: payment, error: paymentError } = await client
          .from('payments')
          .select(PAYMENT_SELECT)
          .eq('order_id', row.order_id)
          .maybeSingle();
        if (paymentError || !isRecord(payment)) {
          return null;
        }

        return mapStoredOrder(row, payment);
      }

      const { data: payment, error: paymentError } = await client
        .from('payments')
        .select(PAYMENT_SELECT)
        .eq('provider_order_id', lookup.providerOrderId)
        .maybeSingle();
      if (paymentError || !isRecord(payment) || typeof payment.order_id !== 'string') {
        return null;
      }

      const { data: row, error: rowError } = await client
        .from('order_payment_statuses')
        .select(ORDER_PAYMENT_STATUS_SELECT)
        .eq('order_id', payment.order_id)
        .maybeSingle();
      if (rowError || !isRecord(row)) {
        return null;
      }

      return mapStoredOrder(row, payment);
    },

    async extendReservation({ orderNumber, minimumMinutes, maxHoldMinutes }) {
      const { data, error } = await client.rpc('extend_paypal_reservation', {
        p_order_number: orderNumber,
        p_minimum_minutes: minimumMinutes,
        p_max_hold_minutes: maxHoldMinutes
      });
      const status = isRecord(data) && typeof data.status === 'string' ? data.status : null;
      if (error || status === 'error') {
        return { status: 'error', code: status ?? undefined } satisfies ReservationExtensionOutcome;
      }
      if (status === 'extended') {
        return {
          status: 'extended',
          reservationExpiresAt:
            isRecord(data) && typeof data.reservationExpiresAt === 'string'
              ? data.reservationExpiresAt
              : undefined
        };
      }
      if (
        status === 'unchanged' ||
        status === 'skipped' ||
        status === 'not_found' ||
        status === 'invalid'
      ) {
        return { status };
      }
      return { status: 'unchanged' };
    },

    async saveProviderOrderId({ orderId, providerOrderId }) {
      await client
        .from('payments')
        .update({ provider_order_id: providerOrderId })
        .eq('order_id', orderId);
    },

    async applyPaymentTransition(input: PaymentTransitionInput) {
      return applyPaymentTransition(
        input,
        client as unknown as Parameters<typeof applyPaymentTransition>[1]
      );
    },

    async recordDuplicateWebhookDelivery({ providerEventId, receivedAt }) {
      const { data, error } = await client
        .from('payment_events')
        .select('id,delivery_count')
        .eq('provider', 'paypal')
        .eq('provider_event_id', providerEventId)
        .maybeSingle();
      if (error || !isRecord(data) || typeof data.id !== 'string') {
        return { duplicate: false } as const;
      }

      const currentCount = typeof data.delivery_count === 'number' ? data.delivery_count : 1;
      const nextCount = currentCount + 1;
      await client
        .from('payment_events')
        .update({
          delivery_count: nextCount,
          last_received_at: receivedAt
        })
        .eq('id', data.id);

      return { duplicate: true, deliveryCount: nextCount } as const;
    },

    async recordWebhookReceipt(input) {
      await insertWebhookEventReceipt(client, input);
    },

    async recordRefundVisibility(input) {
      await insertWebhookEventReceipt(client, {
        ...input,
        verificationStatus: 'verified'
      });

      await client
        .from('payments')
        .update({
          status: input.refundStatus,
          refund_status: input.refundStatus,
          refunded_amount_minor: input.refundedAmountMinor,
          updated_at: input.receivedAt
        })
        .eq('id', input.paymentId);

      await client
        .from('checkout_orders')
        .update({
          status: input.refundStatus,
          order_status: input.refundStatus,
          payment_status: input.refundStatus,
          refund_status: input.refundStatus,
          refunded_amount_minor: input.refundedAmountMinor,
          updated_at: input.receivedAt
        })
        .eq('id', input.orderId);
    }
  };
}

/**
 * Buyer authorization adapter backed by the cross-domain Order Access module.
 */
export function createServerPayPalOrderAccess(): PayPalOrderAccess {
  return createServerOrderAccess();
}

function recordPayPalOperationalFailure(input: PayPalOperationalFailure) {
  return reportOperationalFailure({
    area: 'payment',
    action: input.action,
    severity: input.severity,
    errorCode: input.errorCode,
    summary: input.summary,
    code: input.errorCode,
    facts: input.facts
  });
}

function buildServerPayPalProcessor(withOrderAccess: boolean): PayPalProcessor {
  const env = getServerEnv();
  const adminClient = createSupabaseAdminClient() as unknown as AdminQueryClient;
  return createPayPalProcessor({
    config: env.paypal,
    store: createSupabasePayPalStore(adminClient),
    ...(withOrderAccess ? { orderAccess: createServerPayPalOrderAccess() } : {}),
    triggerEmailOutbox: ({ reason }) => triggerTransactionalEmailOutboxNow({ reason }),
    recordOperationalFailure: recordPayPalOperationalFailure
  });
}

export function createBuyerPayPalProcessor(): PayPalProcessor {
  return buildServerPayPalProcessor(true);
}

export function createSystemPayPalProcessor(): PayPalProcessor {
  return buildServerPayPalProcessor(false);
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export function paypalCreateResponse(outcome: CreatePayPalOrderOutcome) {
  switch (outcome.status) {
    case 'awaiting':
      return jsonResponse(200, outcome);
    case 'verifying':
      return jsonResponse(202, outcome);
    case 'invalid':
      return jsonResponse(outcome.code === 'invalid_paypal_order_request' ? 400 : 409, outcome);
    case 'not_found':
      return jsonResponse(404, outcome);
    case 'unconfigured':
      return jsonResponse(503, outcome);
    case 'error':
      return jsonResponse(502, outcome);
  }
}

export function paypalCaptureResponse(outcome: CapturePayPalOrderOutcome) {
  switch (outcome.status) {
    case 'paid':
      return jsonResponse(200, outcome);
    case 'verifying':
    case 'review_required':
    case 'reconciliation_required':
      return jsonResponse(202, outcome);
    case 'transition_conflict':
      return jsonResponse(409, { status: 'verifying', code: outcome.code });
    case 'expired':
      return jsonResponse(409, outcome);
    case 'invalid':
      return jsonResponse(outcome.code === 'invalid_paypal_capture_request' ? 400 : 409, outcome);
    case 'not_found':
      return jsonResponse(404, outcome);
    case 'unconfigured':
      return jsonResponse(503, outcome);
    case 'error':
      return jsonResponse(502, outcome);
  }
}

export function paypalWebhookResponse(outcome: HandlePayPalWebhookOutcome) {
  switch (outcome.status) {
    case 'accepted':
      return jsonResponse(outcome.result === 'error' ? 502 : 200, outcome);
    case 'duplicate':
    case 'refund_visibility':
      return jsonResponse(200, outcome);
    case 'ignored':
      return jsonResponse(outcome.code === 'paypal_order_not_found' ? 202 : 200, outcome);
    case 'review_required':
      return jsonResponse(202, outcome);
    case 'rejected':
      return jsonResponse(outcome.code === 'paypal_webhook_body_too_large' ? 413 : 400, outcome);
    case 'malformed':
      return jsonResponse(400, outcome);
    case 'unconfigured':
      return jsonResponse(503, outcome);
    case 'error':
      return jsonResponse(502, outcome);
  }
}
