import 'server-only';

import { createHmac } from 'node:crypto';
import { renderTransactionalEmail, type TransactionalEmailRow } from '@/emails/transactional';
import { runMonitoredAction } from '@/operations/monitoring';
import { buildQuickLinkUrl, maskAccountNo } from '@/payments/vietqr/instructions';

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const RETRY_BACKOFF_MS = 15 * 60 * 1000;
// `attempt_count` is incremented by the claim RPC, so this bounds how many
// times a transiently-failing row is re-sent before it is parked as failed.
const MAX_TRANSIENT_ATTEMPTS = 5;
const TRANSACTIONAL_EMAIL_TOKEN_DOMAIN = 'transactional-email-link:v1';
const MIN_TRANSACTIONAL_EMAIL_TOKEN_SECRET_LENGTH = 32;
const TOKEN_PREPARATION_ERROR_CODE = 'email_token_preparation_failed';
const DAY_MS = 24 * 60 * 60 * 1000;

export type TransactionalEmailTokenPurpose =
  | 'digital_download'
  | 'guest_reopen_order'
  | 'guest_claim_order'
  | 'newsletter_unsubscribe';

export function deriveTransactionalEmailToken(
  secret: string | null | undefined,
  outboxId: string,
  purpose: TransactionalEmailTokenPurpose
) {
  if (
    typeof secret !== 'string' ||
    secret.length < MIN_TRANSACTIONAL_EMAIL_TOKEN_SECRET_LENGTH ||
    secret !== secret.trim() ||
    !outboxId
  ) {
    throw new Error('transactional email token signing is unavailable');
  }
  return createHmac('sha256', secret)
    .update(`${TRANSACTIONAL_EMAIL_TOKEN_DOMAIN}:${outboxId}:${purpose}`, 'utf8')
    .digest('base64url');
}

export type ClaimedTransactionalEmailRow = TransactionalEmailRow & {
  claimToken: string;
  createdAt: string;
};

export type TransactionalEmailClaim = Pick<ClaimedTransactionalEmailRow, 'id' | 'claimToken'>;

export type TransactionalEmailVietQrBankConfig = {
  bankId: string;
  accountNo: string;
  accountName: string;
  template: string;
};

export type TransactionalEmailConfig = {
  siteUrl: string;
  fromEmail: string | null | undefined;
  tokenSecret?: string | null;
  batchSize?: number;
  vietqr?: TransactionalEmailVietQrBankConfig | null;
};

export type TransactionalEmailTokenPreparation = {
  rawToken: string;
  expiresAt: string;
  sourceEmailOutboxId: string;
};

type PreparedTransactionalEmailToken = Pick<TransactionalEmailTokenPreparation, 'expiresAt'>;

export type DownloadTokenIssuanceResult =
  | ({status: 'issued'} & PreparedTransactionalEmailToken)
  | {status: 'superseded'}
  | {status: 'error'};

export type TransactionalEmailRepository = {
  claimDueRows: (limit: number, now: Date) => Promise<ClaimedTransactionalEmailRow[]>;
  issueDownloadToken: (
    row: ClaimedTransactionalEmailRow,
    preparation: TransactionalEmailTokenPreparation
  ) => Promise<DownloadTokenIssuanceResult>;
  issueGuestToken: (
    row: ClaimedTransactionalEmailRow,
    purpose: 'reopen_order' | 'claim_order',
    preparation: TransactionalEmailTokenPreparation
  ) => Promise<PreparedTransactionalEmailToken | null>;
  issueNewsletterToken?: (
    row: ClaimedTransactionalEmailRow,
    preparation: TransactionalEmailTokenPreparation
  ) => Promise<PreparedTransactionalEmailToken | null>;
  markSent: (claim: TransactionalEmailClaim, providerMessageId: string, now: Date) => Promise<void>;
  markRetry: (claim: TransactionalEmailClaim, code: string, availableAt: Date) => Promise<void>;
  markFailed: (claim: TransactionalEmailClaim, code: string, now: Date) => Promise<void>;
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
  send: (
    input: TransactionalEmailSendInput
  ) => Promise<
    | { status: 'sent'; providerMessageId: string }
    | { status: 'retry'; code: string }
    | { status: 'failed'; code: string }
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
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_:-]/g, '_')
      .slice(0, 80) || 'email_send_failed'
  );
}

function stringPayloadValue(row: TransactionalEmailRow, key: string) {
  const value = row.payload[key];
  return typeof value === 'string' ? value : null;
}

class TokenPreparationError extends Error {}
class SupersededDigitalAccessError extends Error {}

function tokenExpiryFromOutbox(row: ClaimedTransactionalEmailRow, lifetimeMs: number) {
  const createdAt = new Date(row.createdAt);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new TokenPreparationError();
  }
  return new Date(createdAt.getTime() + lifetimeMs).toISOString();
}

function tokenPreparation(
  row: ClaimedTransactionalEmailRow,
  config: TransactionalEmailConfig,
  purpose: TransactionalEmailTokenPurpose,
  lifetimeMs: number
): TransactionalEmailTokenPreparation {
  try {
    return {
      rawToken: deriveTransactionalEmailToken(config.tokenSecret, row.id, purpose),
      expiresAt: tokenExpiryFromOutbox(row, lifetimeMs),
      sourceEmailOutboxId: row.id
    };
  } catch {
    throw new TokenPreparationError();
  }
}

async function prepareToken(
  row: ClaimedTransactionalEmailRow,
  config: TransactionalEmailConfig,
  purpose: TransactionalEmailTokenPurpose,
  lifetimeMs: number,
  issue: (
    preparation: TransactionalEmailTokenPreparation
  ) => Promise<PreparedTransactionalEmailToken | null>
) {
  const preparation = tokenPreparation(row, config, purpose, lifetimeMs);
  try {
    const prepared = await issue(preparation);
    if (!prepared || prepared.expiresAt !== preparation.expiresAt) {
      throw new TokenPreparationError();
    }
    return { rawToken: preparation.rawToken, expiresAt: prepared.expiresAt };
  } catch {
    throw new TokenPreparationError();
  }
}

async function prepareDownloadToken(
  row: ClaimedTransactionalEmailRow,
  repository: TransactionalEmailRepository,
  config: TransactionalEmailConfig
) {
  const preparation = tokenPreparation(row, config, 'digital_download', DAY_MS);
  try {
    const result = await repository.issueDownloadToken(row, preparation);
    if (result.status === 'superseded') {
      throw new SupersededDigitalAccessError();
    }
    if (
      result.status !== 'issued' ||
      result.expiresAt !== preparation.expiresAt
    ) {
      throw new TokenPreparationError();
    }
    return {rawToken: preparation.rawToken, expiresAt: result.expiresAt};
  } catch (error) {
    if (error instanceof SupersededDigitalAccessError) {
      throw error;
    }
    throw new TokenPreparationError();
  }
}

async function renderContextForRow(
  row: ClaimedTransactionalEmailRow,
  repository: TransactionalEmailRepository,
  config: TransactionalEmailConfig
) {
  const siteUrl = config.siteUrl;
  if (row.eventType === 'digital_access_granted' || row.eventType === 'digital_access_reissued') {
    const token = await prepareDownloadToken(row, repository, config);
    return { siteUrl, downloadToken: token.rawToken, expiresAt: token.expiresAt };
  }
  if (row.eventType === 'guest_order_reopen' || row.eventType === 'guest_order_claim') {
    const guestPurpose = row.eventType === 'guest_order_claim' ? 'claim_order' : 'reopen_order';
    const tokenPurpose =
      row.eventType === 'guest_order_claim' ? 'guest_claim_order' : 'guest_reopen_order';
    const token = await prepareToken(row, config, tokenPurpose, DAY_MS, (preparation) =>
      repository.issueGuestToken(row, guestPurpose, preparation)
    );
    return { siteUrl, guestToken: token.rawToken, expiresAt: token.expiresAt };
  }
  if (row.eventType === 'newsletter_subscribed') {
    const token = await prepareToken(
      row,
      config,
      'newsletter_unsubscribe',
      30 * DAY_MS,
      (preparation) =>
        repository.issueNewsletterToken
          ? repository.issueNewsletterToken(row, preparation)
          : Promise.resolve(null)
    );
    return { siteUrl, newsletterToken: token.rawToken, expiresAt: token.expiresAt };
  }
  if (row.eventType === 'order_created') {
    const isGuest = row.payload.isGuest === true;
    const token = isGuest
      ? await prepareToken(row, config, 'guest_reopen_order', DAY_MS, (preparation) =>
          repository.issueGuestToken(row, 'reopen_order', preparation)
        )
      : null;
    const paymentIntent = stringPayloadValue(row, 'paymentIntent');
    const totalMinor = typeof row.payload.totalMinor === 'number' ? row.payload.totalMinor : null;
    const orderNumber = stringPayloadValue(row, 'orderNumber');
    const vietqr =
      paymentIntent === 'vietqr_intent' && totalMinor !== null && orderNumber && config.vietqr
        ? {
            bankId: config.vietqr.bankId,
            accountName: config.vietqr.accountName,
            accountNoMasked: maskAccountNo(config.vietqr.accountNo),
            qrImageUrl: buildQuickLinkUrl(
              { status: 'configured', ...config.vietqr },
              totalMinor,
              orderNumber
            )
          }
        : null;
    return {
      siteUrl,
      guestToken: token?.rawToken ?? null,
      expiresAt: token?.expiresAt ?? null,
      vietqr
    };
  }
  if (row.eventType === 'payment_received') {
    // Without a reopen token this email's CTA is a bare order URL, which only
    // works on the one device that still holds the guest cookie. Opening the
    // "we got your payment" email on a phone would hit access-denied.
    const isGuest = row.payload.isGuest === true;
    const token = isGuest
      ? await prepareToken(row, config, 'guest_reopen_order', DAY_MS, (preparation) =>
          repository.issueGuestToken(row, 'reopen_order', preparation)
        )
      : null;
    return { siteUrl, guestToken: token?.rawToken ?? null, expiresAt: token?.expiresAt ?? null };
  }
  return { siteUrl };
}

async function recordEmailFailure(
  recorder: OperationalFailureRecorder | undefined,
  row: TransactionalEmailRow,
  input: { severity: 'warning' | 'error'; errorCode: string; summary: string }
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
    errorResult: { status: 'error', code: input.errorCode },
    shouldRecordResult: () => true,
    facts: {
      emailType: row.eventType,
      orderId: row.orderId ?? null,
      entitlementId: row.entitlementId ?? null
    },
    recordOperationalFailure: recorder,
    operation: async () => ({ status: 'error', code: input.errorCode })
  });
}

export async function processTransactionalEmailBatch(input: ProcessInput) {
  if (!input.config.fromEmail) {
    return { status: 'unconfigured' as const, code: 'missing_transactional_email_config' as const };
  }

  const now = input.now?.() ?? new Date();
  const rows = await input.repository.claimDueRows(batchSize(input.config.batchSize), now);
  let sent = 0;
  let retry = 0;
  let failed = 0;

  for (const row of rows) {
    const claim = { id: row.id, claimToken: row.claimToken };
    try {
      const context = await renderContextForRow(row, input.repository, input.config);
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
        await input.repository.markSent(claim, result.providerMessageId, now);
      } else if (result.status === 'retry') {
        if ((row.attemptCount ?? 0) < MAX_TRANSIENT_ATTEMPTS) {
          retry += 1;
          await input.repository.markRetry(
            claim,
            safeCode(result.code),
            new Date(now.getTime() + RETRY_BACKOFF_MS)
          );
          await recordEmailFailure(input.operationalFailureRecorder, row, {
            severity: 'warning',
            errorCode: safeCode(result.code),
            summary: 'Transactional email send scheduled for retry'
          });
        } else {
          failed += 1;
          await input.repository.markFailed(claim, safeCode(result.code), now);
          await recordEmailFailure(input.operationalFailureRecorder, row, {
            severity: 'error',
            errorCode: safeCode(result.code),
            summary: 'Transactional email send failed after exhausting retries'
          });
        }
      } else {
        failed += 1;
        await input.repository.markFailed(claim, safeCode(result.code), now);
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'error',
          errorCode: safeCode(result.code),
          summary: 'Transactional email send failed'
        });
      }
    } catch (error) {
      if (error instanceof SupersededDigitalAccessError) {
        failed += 1;
        await input.repository.markFailed(claim, 'digital_access_superseded', now);
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'warning',
          errorCode: 'digital_access_superseded',
          summary: 'Superseded digital access email was cancelled'
        });
        continue;
      }
      // An exception here is a dropped connection, a provider timeout or a
      // token-minting hiccup — all transient by nature. Burning the row to
      // `failed` on the first one means the customer never receives an email
      // that would have sent fine seconds later, so retry with backoff and
      // only give up once the attempt budget is spent.
      const errorCode =
        error instanceof TokenPreparationError
          ? TOKEN_PREPARATION_ERROR_CODE
          : 'email_worker_error';
      if ((row.attemptCount ?? 0) < MAX_TRANSIENT_ATTEMPTS) {
        retry += 1;
        await input.repository.markRetry(
          claim,
          errorCode,
          new Date(now.getTime() + RETRY_BACKOFF_MS)
        );
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'warning',
          errorCode,
          summary:
            errorCode === TOKEN_PREPARATION_ERROR_CODE
              ? 'Transactional email token preparation failed, scheduled for retry'
              : 'Transactional email worker failed, scheduled for retry'
        });
      } else {
        failed += 1;
        await input.repository.markFailed(claim, errorCode, now);
        await recordEmailFailure(input.operationalFailureRecorder, row, {
          severity: 'error',
          errorCode,
          summary:
            errorCode === TOKEN_PREPARATION_ERROR_CODE
              ? 'Transactional email token preparation failed after exhausting retries'
              : 'Transactional email worker failed after exhausting retries'
        });
      }
    }
  }

  return { status: 'processed' as const, claimed: rows.length, sent, retry, failed };
}
