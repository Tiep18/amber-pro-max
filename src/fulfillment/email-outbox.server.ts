import 'server-only';

import { Resend } from 'resend';
import type { TransactionalEmailRow } from '@/emails/transactional';
import { hashFulfillmentAccessToken } from '@/fulfillment/downloads';
import {
  processTransactionalEmailBatch,
  type ClaimedTransactionalEmailRow,
  type TransactionalEmailRepository,
  type TransactionalEmailSender,
  type TransactionalEmailTokenPreparation
} from '@/fulfillment/email-outbox';
import { getServerEnv } from '@/lib/env/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { recordOperationalFailure } from '@/operations/errors';
import { hashNewsletterUnsubscribeToken } from '@/newsletter/consent';

type SupabaseLike = {
  from: (table: string) => unknown;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function safeCode(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_:-]/g, '_')
      .slice(0, 80) || 'email_send_failed'
  );
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
    row.claim_token.length === 0 ||
    typeof row.created_at !== 'string' ||
    !Number.isFinite(new Date(row.created_at).getTime())
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
    claimToken: row.claim_token,
    createdAt: row.created_at
  };
}

type SourceLinkedTokenRow = Record<string, unknown> & {
  token_hash?: unknown;
  expires_at?: unknown;
};

type SourceLinkedTokenTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      maybeSingle: () => Promise<{ data: SourceLinkedTokenRow | null; error: unknown }>;
    };
  };
  insert: (value: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

async function findSourceLinkedToken(table: SourceLinkedTokenTable, sourceEmailOutboxId: string) {
  return table.select('*').eq('source_email_outbox_id', sourceEmailOutboxId).maybeSingle();
}

function matchesPreparedToken(
  row: SourceLinkedTokenRow,
  preparation: TransactionalEmailTokenPreparation,
  expected: Record<string, string>
) {
  return (
    row.token_hash === expected.token_hash &&
    row.expires_at === preparation.expiresAt &&
    Object.entries(expected).every(([key, value]) => row[key] === value)
  );
}

async function prepareSourceLinkedToken(input: {
  table: SourceLinkedTokenTable;
  preparation: TransactionalEmailTokenPreparation;
  insert: Record<string, unknown>;
  expected: Record<string, string>;
}) {
  const existing = await findSourceLinkedToken(input.table, input.preparation.sourceEmailOutboxId);
  if (existing.error) {
    return null;
  }
  if (existing.data) {
    return matchesPreparedToken(existing.data, input.preparation, input.expected)
      ? { expiresAt: input.preparation.expiresAt }
      : null;
  }

  const inserted = await input.table.insert(input.insert);
  if (!inserted.error) {
    return { expiresAt: input.preparation.expiresAt };
  }

  // A concurrent claimant may have won the partial unique index race. Read
  // that row and accept it only when it is byte-for-byte the same issuance.
  const raced = await findSourceLinkedToken(input.table, input.preparation.sourceEmailOutboxId);
  if (
    raced.error ||
    !raced.data ||
    !matchesPreparedToken(raced.data, input.preparation, input.expected)
  ) {
    return null;
  }
  return { expiresAt: input.preparation.expiresAt };
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
  const { data, error } = await client.rpc('transition_transactional_email_claim', {
    p_id: input.id,
    p_claim_token: input.claimToken,
    p_status: input.status,
    p_provider_message_id: input.providerMessageId ?? null,
    p_error_code: input.errorCode ?? null,
    p_available_at: input.availableAt?.toISOString() ?? null,
    p_transitioned_at: input.transitionedAt.toISOString()
  });
  if (error) {
    throw new Error('transition_transactional_email_claim failed', { cause: error });
  }
  if (typeof data !== 'boolean') {
    throw new Error('transition_transactional_email_claim returned a malformed result');
  }
  if (!data) {
    throw new Error('transactional email claim ownership was lost');
  }
}

export function createSupabaseEmailOutboxRepository(
  client: SupabaseLike
): TransactionalEmailRepository {
  return {
    async claimDueRows(limit) {
      // One atomic RPC: FOR UPDATE SKIP LOCKED assigns each row to exactly one
      // worker, and the same call reclaims rows whose lease expired because a
      // previous worker died mid-send. A read-then-write pair here would let
      // two overlapping workers send the same email twice.
      const { data, error } = await client.rpc('claim_transactional_emails', {
        p_limit: limit,
        p_lease_seconds: OUTBOX_LEASE_SECONDS
      });
      if (error) {
        throw new Error('claim_transactional_emails failed', { cause: error });
      }
      if (!Array.isArray(data) || data.some((row) => !isRecord(row))) {
        throw new Error('claim_transactional_emails returned malformed data');
      }
      return data.map(mapRow);
    },
    async issueDownloadToken(row, preparation) {
      if (!row.entitlementId) {
        return { status: 'error' };
      }
      const tokenHash = hashFulfillmentAccessToken(preparation.rawToken);
      const { data, error } = await client.rpc('issue_digital_access_token_for_outbox', {
        p_source_email_outbox_id: preparation.sourceEmailOutboxId,
        p_token_hash: tokenHash,
        p_expires_at: preparation.expiresAt
      });
      if (error) {
        return { status: 'error' };
      }
      if (data === null) {
        return { status: 'superseded' };
      }
      if (typeof data !== 'string') {
        return { status: 'error' };
      }
      const acceptedExpiry = new Date(data).getTime();
      const expectedExpiry = new Date(preparation.expiresAt).getTime();
      if (
        !Number.isFinite(acceptedExpiry) ||
        !Number.isFinite(expectedExpiry) ||
        acceptedExpiry !== expectedExpiry
      ) {
        return { status: 'error' };
      }
      return { status: 'issued', expiresAt: preparation.expiresAt };
    },
    async issueGuestToken(row, purpose, preparation) {
      if (!row.orderId) {
        return null;
      }
      const table = client.from('guest_order_access_tokens') as SourceLinkedTokenTable;
      const contactEmail = row.recipientEmail.trim().toLowerCase();
      const tokenHash = hashFulfillmentAccessToken(preparation.rawToken);
      return prepareSourceLinkedToken({
        table,
        preparation,
        expected: {
          order_id: row.orderId,
          contact_email: contactEmail,
          token_hash: tokenHash,
          purpose,
          status: 'active'
        },
        insert: {
          order_id: row.orderId,
          contact_email: contactEmail,
          token_hash: tokenHash,
          purpose,
          status: 'active',
          expires_at: preparation.expiresAt,
          source_email_outbox_id: preparation.sourceEmailOutboxId
        }
      });
    },
    async issueNewsletterToken(row, preparation) {
      const table = client.from('newsletter_unsubscribe_tokens') as SourceLinkedTokenTable;
      const normalizedEmail = row.recipientEmail.trim().toLowerCase();
      const tokenHash = hashNewsletterUnsubscribeToken(preparation.rawToken);
      return prepareSourceLinkedToken({
        table,
        preparation,
        expected: {
          normalized_email: normalizedEmail,
          token_hash: tokenHash
        },
        insert: {
          normalized_email: normalizedEmail,
          token_hash: tokenHash,
          expires_at: preparation.expiresAt,
          source_email_outbox_id: preparation.sourceEmailOutboxId
        }
      });
    },
    async markSent(claim, providerMessageId, now) {
      await transitionClaim(client, {
        ...claim,
        status: 'sent',
        providerMessageId,
        transitionedAt: now
      });
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
      await transitionClaim(client, {
        ...claim,
        status: 'failed',
        errorCode: code,
        transitionedAt: now
      });
    }
  };
}

function retryableResendCode(code: string) {
  return (
    code === 'rate_limit_exceeded' ||
    code === 'internal_server_error' ||
    code === 'application_error'
  );
}

export function createResendTransactionalEmailSender(apiKey: string): TransactionalEmailSender {
  const resend = new Resend(apiKey);
  return {
    async send(input) {
      const { data, error } = await resend.emails.send(
        {
          to: input.to,
          from: input.from,
          subject: input.subject,
          html: input.html,
          text: input.text
        },
        { idempotencyKey: input.idempotencyKey }
      );
      if (error) {
        const code = safeCode(
          'name' in error && typeof error.name === 'string' ? error.name : 'resend_error'
        );
        return retryableResendCode(code) ? { status: 'retry', code } : { status: 'failed', code };
      }
      return { status: 'sent', providerMessageId: data?.id ?? input.idempotencyKey };
    }
  };
}

export function createProductionEmailOutboxRepository() {
  return createSupabaseEmailOutboxRepository(
    createSupabaseAdminClient() as unknown as SupabaseLike
  );
}

export type ImmediateEmailOutboxTriggerReason =
  | 'paypal_capture_paid'
  | 'paypal_webhook_paid'
  | 'vietqr_admin_paid'
  | 'late_review_settled'
  | 'newsletter_subscribed'
  | 'checkout_submitted';

export async function triggerTransactionalEmailOutboxNow(input: {
  reason: ImmediateEmailOutboxTriggerReason;
  batchSize?: number;
}) {
  const env = getServerEnv();
  if (env.transactionalEmail.status !== 'configured' || !env.transactionalEmail.resendApiKey) {
    return { status: 'unconfigured' as const, code: env.transactionalEmail.code };
  }

  try {
    return await processTransactionalEmailBatch({
      repository: createProductionEmailOutboxRepository(),
      sender: createResendTransactionalEmailSender(env.transactionalEmail.resendApiKey),
      config: {
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
        fromEmail: env.transactionalEmail.fromEmail,
        tokenSecret: env.transactionalEmailTokenSecret,
        batchSize: input.batchSize,
        vietqr:
          env.vietqr.status === 'configured' &&
          env.vietqr.bankId &&
          env.vietqr.accountNo &&
          env.vietqr.accountName
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
    return { status: 'error' as const, code: 'transactional_email_worker_trigger_failed' as const };
  }
}
