import {renderTransactionalEmail, type TransactionalEmailRow} from '@/emails/transactional';
import {runMonitoredAction} from '@/operations/monitoring';

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const RETRY_BACKOFF_MS = 15 * 60 * 1000;

export type TransactionalEmailConfig = {
  siteUrl: string;
  fromEmail: string | null | undefined;
  batchSize?: number;
};

export type TransactionalEmailRepository = {
  claimDueRows: (limit: number, now: Date) => Promise<TransactionalEmailRow[]>;
  issueDownloadToken: (row: TransactionalEmailRow, now: Date) => Promise<{rawToken: string; expiresAt: string} | null>;
  issueGuestToken: (row: TransactionalEmailRow, purpose: 'reopen_order' | 'claim_order', now: Date) => Promise<{rawToken: string; expiresAt: string} | null>;
  issueNewsletterToken?: (row: TransactionalEmailRow, now: Date) => Promise<{rawToken: string; expiresAt: string} | null>;
  markSent: (id: string, providerMessageId: string, now: Date) => Promise<void>;
  markRetry: (id: string, code: string, availableAt: Date) => Promise<void>;
  markFailed: (id: string, code: string, now: Date) => Promise<void>;
};

export type TransactionalEmailSendInput = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type TransactionalEmailSender = {
  send: (input: TransactionalEmailSendInput) => Promise<
    | {status: 'sent'; providerMessageId: string}
    | {status: 'retry'; code: string}
    | {status: 'failed'; code: string}
  >;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type ProcessInput = {
  repository: TransactionalEmailRepository;
  sender: TransactionalEmailSender;
  config: TransactionalEmailConfig;
  operationalFailureRecorder?: OperationalFailureRecorder;
  now?: () => Date;
};

function batchSize(value: number | undefined) {
  return Math.max(1, Math.min(MAX_BATCH_SIZE, value ?? DEFAULT_BATCH_SIZE));
}

function safeCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'email_send_failed';
}

async function renderContextForRow(row: TransactionalEmailRow, repository: TransactionalEmailRepository, siteUrl: string, now: Date) {
  if (row.eventType === 'digital_access_granted' || row.eventType === 'digital_access_reissued') {
    const token = await repository.issueDownloadToken(row, now);
    return {siteUrl, downloadToken: token?.rawToken ?? null, expiresAt: token?.expiresAt ?? null};
  }
  if (row.eventType === 'guest_order_reopen' || row.eventType === 'guest_order_claim') {
    const token = await repository.issueGuestToken(row, row.eventType === 'guest_order_claim' ? 'claim_order' : 'reopen_order', now);
    return {siteUrl, guestToken: token?.rawToken ?? null, expiresAt: token?.expiresAt ?? null};
  }
  if (row.eventType === 'newsletter_subscribed') {
    const token = await repository.issueNewsletterToken?.(row, now);
    if (!token) {
      throw new Error('newsletter unsubscribe token could not be issued');
    }
    return {siteUrl, newsletterToken: token.rawToken, expiresAt: token.expiresAt};
  }
  return {siteUrl};
}

async function recordEmailFailure(
  recorder: OperationalFailureRecorder | undefined,
  row: TransactionalEmailRow,
  input: {severity: 'warning' | 'error'; errorCode: string; summary: string}
) {
  if (!recorder) {
    return;
  }
  await runMonitoredAction({
    area: 'email',
    action: 'transactional_email_send',
    severity: input.severity,
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: {status: 'error', code: input.errorCode},
    shouldRecordResult: () => true,
    facts: {
      emailType: row.eventType,
      orderId: row.orderId ?? null,
      entitlementId: row.entitlementId ?? null
    },
    recordOperationalFailure: recorder,
    operation: async () => ({status: 'error', code: input.errorCode})
  });
}

export async function processTransactionalEmailBatch(input: ProcessInput) {
  if (!input.config.fromEmail) {
    return {status: 'unconfigured' as const, code: 'missing_transactional_email_config' as const};
  }

  const now = input.now?.() ?? new Date();
  const rows = await input.repository.claimDueRows(batchSize(input.config.batchSize), now);
  let sent = 0;
  let retry = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const context = await renderContextForRow(row, input.repository, input.config.siteUrl, now);
      const rendered = renderTransactionalEmail(row, context);
      const result = await input.sender.send({
        to: row.recipientEmail,
        from: input.config.fromEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: `transactional-email:${row.id}`
      });
      if (result.status === 'sent') {
        sent += 1;
        await input.repository.markSent(row.id, result.providerMessageId, now);
      } else if (result.status === 'retry') {
        retry += 1;
        await input.repository.markRetry(row.id, safeCode(result.code), new Date(now.getTime() + RETRY_BACKOFF_MS));
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'warning',
          errorCode: safeCode(result.code),
          summary: 'Transactional email send scheduled for retry'
        });
      } else {
        failed += 1;
        await input.repository.markFailed(row.id, safeCode(result.code), now);
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'error',
          errorCode: safeCode(result.code),
          summary: 'Transactional email send failed'
        });
      }
    } catch {
      failed += 1;
      await input.repository.markFailed(row.id, 'email_worker_error', now);
      await recordEmailFailure(input.operationalFailureRecorder, row, {
        severity: 'error',
        errorCode: 'email_worker_error',
        summary: 'Transactional email worker failed'
      });
    }
  }

  return {status: 'processed' as const, claimed: rows.length, sent, retry, failed};
}
