import {z} from 'zod';
import type {AuthUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {runMonitoredAction} from '@/operations/monitoring';
import {findGuestOrderToken, isGuestOrderTokenUsable} from '@/fulfillment/guest-order-tokens';

const reopenSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  locale: z.enum(['en', 'vi']),
  targetHash: z.string().regex(/^[a-f0-9]{64}$/),
  ipHash: z.string().regex(/^[a-f0-9]{64}$/)
});

const claimSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  rawToken: z.string().trim().min(1).max(512),
  user: z.object({id: z.uuid(), email: z.email()})
});

type QueryClient = {
  from: (table: string) => unknown;
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type OrderRow = {
  id: string;
  order_number: string;
  contact_email: string;
  locale?: Locale;
  owner_user_id?: string | null;
};

export type GuestReopenResult = {status: 'sent'};
export type ClaimGuestOrderResult =
  | {status: 'claimed'}
  | {status: 'denied'; code: 'claim_not_available'}
  | {status: 'invalid'; code: 'invalid_claim_request'}
  | {status: 'error'; code: 'claim_failed'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sameEmail(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function asOrderRow(value: unknown): OrderRow | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.order_number !== 'string' || typeof value.contact_email !== 'string') {
    return null;
  }
  return {
    id: value.id,
    order_number: value.order_number,
    contact_email: value.contact_email,
    locale: value.locale === 'vi' ? 'vi' : 'en',
    owner_user_id: typeof value.owner_user_id === 'string' ? value.owner_user_id : null
  };
}

async function findOrderByNumber(client: QueryClient, orderNumber: string) {
  const query = client.from('checkout_orders') as {
    select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>}};
  };
  const {data, error} = await query.select('id,order_number,contact_email,owner_user_id').eq('order_number', orderNumber).maybeSingle();
  if (error) {
    return null;
  }
  return asOrderRow(data);
}

async function recordGuestOrderFailure({
  action,
  orderNumber,
  errorCode,
  summary,
  code,
  referenceId,
  status
}: {
  action: 'guest_order_reopen' | 'guest_order_claim_email' | 'guest_order_claim';
  orderNumber: string;
  errorCode: string;
  summary: string;
  code?: string;
  referenceId?: string | null;
  status?: string | null;
}) {
  await runMonitoredAction({
    area: 'fulfillment',
    action,
    errorCode,
    summary,
    errorResult: {status: 'error', code: code ?? errorCode},
    shouldRecordResult: () => true,
    facts: {
      orderNumber,
      referenceId: referenceId ?? null,
      status: status ?? null
    },
    operation: async () => ({status: 'error', code: code ?? errorCode})
  });
}

async function requestGuestOrderEmail(
  input: z.input<typeof reopenSchema>,
  purpose: 'reopen_order' | 'claim_order',
  client: RpcClient
): Promise<GuestReopenResult> {
  const parsed = reopenSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'sent'};
  }

  const action = purpose === 'claim_order' ? 'guest_order_claim_email' : 'guest_order_reopen';
  const {data, error} = await client.rpc('request_guest_order_email', {
    p_order_number: parsed.data.orderNumber.trim().toUpperCase(),
    p_email: parsed.data.email,
    p_locale: parsed.data.locale,
    p_purpose: purpose,
    p_target_hash: parsed.data.targetHash,
    p_ip_hash: parsed.data.ipHash
  });
  if (error || !isRecord(data) || data.status !== 'sent') {
    await recordGuestOrderFailure({
      action,
      orderNumber: parsed.data.orderNumber,
      errorCode: purpose === 'claim_order'
        ? 'guest_order.claim_email_request_failed'
        : 'guest_order.reopen_email_request_failed',
      summary: purpose === 'claim_order'
        ? 'Guest order claim email request failed'
        : 'Guest order reopen email request failed'
    });
  }
  return {status: 'sent'};
}

export async function requestGuestOrderReopen(input: z.input<typeof reopenSchema>, client: RpcClient): Promise<GuestReopenResult> {
  return requestGuestOrderEmail(input, 'reopen_order', client);
}

export async function requestGuestOrderClaimEmail(input: z.input<typeof reopenSchema>, client: RpcClient): Promise<GuestReopenResult> {
  return requestGuestOrderEmail(input, 'claim_order', client);
}

export async function claimGuestOrder(input: z.input<typeof claimSchema>, client: QueryClient): Promise<ClaimGuestOrderResult> {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_claim_request'};
  }

  const order = await findOrderByNumber(client, parsed.data.orderNumber);
  if (!order || order.owner_user_id || !sameEmail(order.contact_email, parsed.data.user.email)) {
    return {status: 'denied', code: 'claim_not_available'};
  }

  const token = await findGuestOrderToken({
    client,
    orderId: order.id,
    rawToken: parsed.data.rawToken,
    purpose: 'claim_order'
  });
  if (!isGuestOrderTokenUsable(token) || !token || !sameEmail(token.contact_email, parsed.data.user.email)) {
    return {status: 'denied', code: 'claim_not_available'};
  }

  try {
    const orders = client.from('checkout_orders') as {
      update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
    };
    const tokenTable = client.from('guest_order_access_tokens') as {
      update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
    };
    const audit = client.from('fulfillment_audit_events') as {
      insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
    };
    const now = new Date().toISOString();
    const orderUpdate = await orders.update({owner_user_id: parsed.data.user.id, updated_at: now}).eq('id', order.id);
    if (orderUpdate.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim owner update failed',
        code: 'claim_failed',
        status: 'order_update_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    const tokenUpdate = await tokenTable.update({status: 'revoked', revoked_at: now, consumed_at: now}).eq('order_id', order.id);
    if (tokenUpdate.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim token revoke failed',
        code: 'claim_failed',
        status: 'token_revoke_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    const auditInsert = await audit.insert({
      event_key: `guest_order_claim:${order.id}:${token.id}`,
      order_id: order.id,
      event_type: 'guest_order_claim',
      actor_type: 'customer',
      actor_id: parsed.data.user.id,
      metadata: {orderNumber: order.order_number}
    });
    if (auditInsert.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim audit insert failed',
        code: 'claim_failed',
        status: 'audit_insert_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    return {status: 'claimed'};
  } catch {
    await recordGuestOrderFailure({
      action: 'guest_order_claim',
      orderNumber: order.order_number,
      referenceId: order.id,
      errorCode: 'guest_order.claim_failed',
      summary: 'Guest order claim mutation threw an exception',
      code: 'claim_failed'
    });
    return {status: 'error', code: 'claim_failed'};
  }
}

export async function requestGuestOrderReopenWithAdminClient(input: z.input<typeof reopenSchema>) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return requestGuestOrderReopen(input, createSupabaseAdminClient() as unknown as RpcClient);
}

export async function requestGuestOrderClaimEmailWithAdminClient(input: z.input<typeof reopenSchema>) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return requestGuestOrderClaimEmail(input, createSupabaseAdminClient() as unknown as RpcClient);
}

export async function claimGuestOrderWithAdminClient(input: {orderNumber: string; rawToken: string; user: AuthUser}) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return claimGuestOrder(input, createSupabaseAdminClient() as unknown as QueryClient);
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function claimGuestOrderAction(formData: FormData): Promise<ClaimGuestOrderResult> {
  'use server';

  const locale = formString(formData, 'locale') === 'vi' ? 'vi' : 'en';
  const orderNumber = formString(formData, 'orderNumber');
  const {requireUser} = await import('@/auth/guards');
  const claimPath = '/' + locale + '/' + (locale === 'vi' ? 'don-hang' : 'orders') + '/' + encodeURIComponent(orderNumber) + '/claim';
  const user = await requireUser({locale, next: claimPath});
  return claimGuestOrderWithAdminClient({
    orderNumber,
    rawToken: formString(formData, 'token'),
    user
  });
}
