import 'server-only';

import {randomUUID} from 'node:crypto';
import {Resend} from 'resend';
import type {TransactionalEmailRow} from '@/emails/transactional';
import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';
import {
  processTransactionalEmailBatch,
  type ClaimedTransactionalEmailRow,
  type TransactionalEmailRepository,
  type TransactionalEmailSender
} from '@/fulfillment/email-outbox';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {recordOperationalFailure} from '@/operations/errors';
import {createNewsletterUnsubscribeToken, hashNewsletterUnsubscribeToken} from '@/newsletter/consent';

type SupabaseLike = {
  from: (table: string) => unknown;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

function newRawToken() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

function tokenExpiry(now: Date) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function newsletterTokenExpiry(now: Date) {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

function safeCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'email_send_failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapRow(row: Record<string, unknown>): ClaimedTransactionalEmailRow {
  if (
    typeof row.id !== 'string' ||
    typeof row.event_type !== 'string' ||
    typeof row.recipient_email !== 'string' ||
    (row.locale !== 'en' && row.locale !== 'vi') ||
    (row.order_id !== null && typeof row.order_id !== 'string') ||
    (row.entitlement_id !== null && typeof row.entitlement_id !== 'string') ||
    !isRecord(row.payload) ||
    typeof row.attempt_count !== 'number' ||
    !Number.isInteger(row.attempt_count) ||
    row.attempt_count < 1 ||
    typeof row.claim_token !== 'string' ||
    row.claim_token.length === 0
  ) {
    throw new Error('claim_transactional_emails returned a malformed row');
  }
  return {
    id: row.id,
    eventType: row.event_type as TransactionalEmailRow['eventType'],
    recipientEmail: row.recipient_email,
    locale: row.locale,
    orderId: typeof row.order_id === 'string' ? row.order_id : null,
    entitlementId: typeof row.entitlement_id === 'string' ? row.entitlement_id : null,
    payload: row.payload,
    attemptCount: row.attempt_count,
    claimToken: row.claim_token
  };
}

// Long enough that a slow provider call cannot lose its own claim, short
// enough that a crashed worker's rows are retried within one cron cycle.
const OUTBOX_LEASE_SECONDS = 300;

async function transitionClaim(
  client: SupabaseLike,
  input: {
    id: string;
    claimToken: string;
    status: 'sent' | 'pending' | 'failed';
    providerMessageId?: string;
    errorCode?: string;
    availableAt?: Date;
    transitionedAt: Date;
  }
) {
  const {data, error} = await client.rpc('transition_transactional_email_claim', {
    p_id: input.id,
    p_claim_token: input.claimToken,
    p_status: input.status,
    p_provider_message_id: input.providerMessageId ?? null,
    p_error_code: input.errorCode ?? null,
    p_available_at: input.availableAt?.toISOString() ?? null,
    p_transitioned_at: input.transitionedAt.toISOString()
  });
  if (error) {
    throw new Error('transition_transactional_email_claim failed', {cause: error});
  }
  if (typeof data !== 'boolean') {
    throw new Error('transition_transactional_email_claim returned a malformed result');
  }
  if (!data) {
    throw new Error('transactional email claim ownership was lost');
  }
}

export function createSupabaseEmailOutboxRepository(client: SupabaseLike): TransactionalEmailRepository {
  return {
    async claimDueRows(limit) {
      // One atomic RPC: FOR UPDATE SKIP LOCKED assigns each row to exactly one
      // worker, and the same call reclaims rows whose lease expired because a
      // previous worker died mid-send. A read-then-write pair here would let
      // two overlapping workers send the same email twice.
      const {data, error} = await client.rpc('claim_transactional_emails', {
        p_limit: limit,
        p_lease_seconds: OUTBOX_LEASE_SECONDS
      });
      if (error) {
        throw new Error('claim_transactional_emails failed', {cause: error});
      }
      if (!Array.isArray(data) || data.some((row) => !isRecord(row))) {
        throw new Error('claim_transactional_emails returned malformed data');
      }
      return data.map(mapRow);
    },
    async issueDownloadToken(row, now) {
      if (!row.entitlementId) {
        return null;
      }
      const rawToken = newRawToken();
      const expiresAt = tokenExpiry(now);
      const insert = client.from('digital_access_tokens') as {
        insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
      };
      const {error} = await insert.insert({
        entitlement_id: row.entitlementId,
        token_hash: hashFulfillmentAccessToken(rawToken),
        purpose: 'download',
        status: 'active',
        expires_at: expiresAt.toISOString()
      });
      return error ? null : {rawToken, expiresAt: expiresAt.toISOString()};
    },
    async issueGuestToken(row, purpose, now) {
      if (!row.orderId) {
        return null;
      }
      const rawToken = newRawToken();
      const expiresAt = tokenExpiry(now);
      const insert = client.from('guest_order_access_tokens') as {
        insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
      };
      const {error} = await insert.insert({
        order_id: row.orderId,
        contact_email: row.recipientEmail,
        token_hash: hashFulfillmentAccessToken(rawToken),
        purpose,
        status: 'active',
        expires_at: expiresAt.toISOString()
      });
      return error ? null : {rawToken, expiresAt: expiresAt.toISOString()};
    },
    async issueNewsletterToken(row, now) {
      const rawToken = createNewsletterUnsubscribeToken();
      const expiresAt = newsletterTokenExpiry(now);
      const insert = client.from('newsletter_unsubscribe_tokens') as {
        insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
      };
      const {error} = await insert.insert({
        normalized_email: row.recipientEmail.trim().toLowerCase(),
        token_hash: hashNewsletterUnsubscribeToken(rawToken),
        expires_at: expiresAt.toISOString()
      });
      return error ? null : {rawToken, expiresAt: expiresAt.toISOString()};
    },
    async markSent(claim, providerMessageId, now) {
      await transitionClaim(client, {...claim, status: 'sent', providerMessageId, transitionedAt: now});
    },
    async markRetry(claim, code, availableAt) {
      await transitionClaim(client, {
        ...claim,
        status: 'pending',
        errorCode: code,
        availableAt,
        transitionedAt: new Date()
      });
    },
    async markFailed(claim, code, now) {
      await transitionClaim(client, {...claim, status: 'failed', errorCode: code, transitionedAt: now});
    }
  };
}

function retryableResendCode(code: string) {
  return code === 'rate_limit_exceeded' || code === 'internal_server_error' || code === 'application_error';
}

export function createResendTransactionalEmailSender(apiKey: string): TransactionalEmailSender {
  const resend = new Resend(apiKey);
  return {
    async send(input) {
      const {data, error} = await resend.emails.send(
        {
          to: input.to,
          from: input.from,
          subject: input.subject,
          html: input.html,
          text: input.text
        },
        {idempotencyKey: input.idempotencyKey}
      );
      if (error) {
        const code = safeCode('name' in error && typeof error.name === 'string' ? error.name : 'resend_error');
        return retryableResendCode(code) ? {status: 'retry', code} : {status: 'failed', code};
      }
      return {status: 'sent', providerMessageId: data?.id ?? input.idempotencyKey};
    }
  };
}

export function createProductionEmailOutboxRepository() {
  return createSupabaseEmailOutboxRepository(createSupabaseAdminClient() as unknown as SupabaseLike);
}

export type ImmediateEmailOutboxTriggerReason =
  | 'paypal_capture_paid'
  | 'paypal_webhook_paid'
  | 'vietqr_admin_paid'
  | 'late_review_settled'
  | 'newsletter_subscribed'
  | 'checkout_submitted';

export async function triggerTransactionalEmailOutboxNow(input: {reason: ImmediateEmailOutboxTriggerReason; batchSize?: number}) {
  const env = getServerEnv();
  if (env.transactionalEmail.status !== 'configured' || !env.transactionalEmail.resendApiKey) {
    return {status: 'unconfigured' as const, code: env.transactionalEmail.code};
  }

  try {
    return await processTransactionalEmailBatch({
      repository: createProductionEmailOutboxRepository(),
      sender: createResendTransactionalEmailSender(env.transactionalEmail.resendApiKey),
      config: {
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
        fromEmail: env.transactionalEmail.fromEmail,
        batchSize: input.batchSize,
        vietqr:
          env.vietqr.status === 'configured' && env.vietqr.bankId && env.vietqr.accountNo && env.vietqr.accountName
            ? {
                bankId: env.vietqr.bankId,
                accountNo: env.vietqr.accountNo,
                accountName: env.vietqr.accountName,
                template: env.vietqr.template
              }
            : null
      },
      operationalFailureRecorder: recordOperationalFailure
    });
  } catch {
    return {status: 'error' as const, code: 'transactional_email_worker_trigger_failed' as const};
  }
}
