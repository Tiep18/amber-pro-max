import 'server-only';

import {randomUUID} from 'node:crypto';
import {Resend} from 'resend';
import type {TransactionalEmailRow} from '@/emails/transactional';
import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';
import type {TransactionalEmailRepository, TransactionalEmailSender} from '@/fulfillment/email-outbox';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';

type SupabaseLike = {
  from: (table: string) => unknown;
};

function newRawToken() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

function tokenExpiry(now: Date) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function safeCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'email_send_failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapRow(row: Record<string, unknown>): TransactionalEmailRow | null {
  if (typeof row.id !== 'string' || typeof row.event_type !== 'string' || typeof row.recipient_email !== 'string') {
    return null;
  }
  return {
    id: row.id,
    eventType: row.event_type as TransactionalEmailRow['eventType'],
    recipientEmail: row.recipient_email,
    locale: row.locale === 'vi' ? 'vi' : 'en',
    orderId: typeof row.order_id === 'string' ? row.order_id : null,
    entitlementId: typeof row.entitlement_id === 'string' ? row.entitlement_id : null,
    payload: isRecord(row.payload) ? row.payload : {}
  };
}

export function createSupabaseEmailOutboxRepository(client: SupabaseLike): TransactionalEmailRepository {
  return {
    async claimDueRows(limit, now) {
      const query = client.from('transactional_email_outbox') as {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            lte: (column: string, value: string) => {
              order: (column: string, options: {ascending: boolean}) => {
                limit: (count: number) => Promise<{data: unknown[] | null; error: unknown}>;
              };
            };
          };
        };
        update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
      };
      const {data, error} = await query
        .select('id,event_type,recipient_email,locale,order_id,entitlement_id,payload')
        .eq('status', 'pending')
        .lte('available_at', now.toISOString())
        .order('available_at', {ascending: true})
        .limit(limit);
      if (error || !Array.isArray(data)) {
        return [];
      }
      const rows = data.filter(isRecord).map(mapRow).filter((row): row is TransactionalEmailRow => Boolean(row));
      await Promise.all(rows.map((row) => query.update({status: 'sending', updated_at: now.toISOString()}).eq('id', row.id)));
      return rows;
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
    async markSent(id, providerMessageId, now) {
      const update = client.from('transactional_email_outbox') as {
        update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
      };
      await update.update({status: 'sent', sent_at: now.toISOString(), updated_at: now.toISOString()}).eq('id', id);
    },
    async markRetry(id, code, availableAt) {
      const update = client.from('transactional_email_outbox') as {
        update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
      };
      await update.update({status: 'pending', available_at: availableAt.toISOString(), updated_at: new Date().toISOString()}).eq('id', id);
    },
    async markFailed(id, code, now) {
      const update = client.from('transactional_email_outbox') as {
        update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
      };
      await update.update({status: 'failed', updated_at: now.toISOString()}).eq('id', id);
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
