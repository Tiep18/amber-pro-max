import 'server-only';

import {createHash, randomBytes} from 'node:crypto';
import {z} from 'zod';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/).optional().nullable();
const subscribeInputSchema = z.object({
  email: emailSchema,
  locale: z.enum(['vi', 'en']),
  market: z.enum(['vn', 'intl']),
  source: z.literal('footer'),
  ipHash: hashSchema,
  userAgentHash: hashSchema
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hashEvidence(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? createHash('sha256').update(normalized, 'utf8').digest('hex') : null;
}

export function normalizeNewsletterEmail(value: string) {
  const parsed = emailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function shapeConsentMetadata({ip, userAgent}: {ip?: string | null; userAgent?: string | null}) {
  return {
    ipHash: hashEvidence(ip),
    userAgentHash: hashEvidence(userAgent)
  };
}

export type NewsletterSubscribeResult = {status: 'idle' | 'subscribed' | 'invalid' | 'error'};

export type NewsletterUnsubscribeResult = {status: 'unsubscribed' | 'unavailable' | 'invalid' | 'error'};

export function createNewsletterUnsubscribeToken() {
  return randomBytes(32).toString('hex');
}

export function hashNewsletterUnsubscribeToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

async function recordNewsletterFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {
    action: 'newsletter_subscribe' | 'newsletter_unsubscribe';
    errorCode: 'newsletter_subscribe_failed' | 'newsletter_unsubscribe_failed';
    summary: string;
    market?: string;
  }
) {
  if (!recorder) {
    return;
  }
  await recorder({
    area: 'application',
    severity: 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      action: input.action,
      market: input.market,
      code: input.errorCode
    }
  });
}

export async function subscribeNewsletter(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<NewsletterSubscribeResult> {
  const parsed = subscribeInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid'};
  }

  const {data, error} = await client.rpc('subscribe_newsletter', {
    p_email: parsed.data.email,
    p_locale: parsed.data.locale,
    p_market: parsed.data.market,
    p_source: parsed.data.source,
    p_ip_hash: parsed.data.ipHash ?? null,
    p_user_agent_hash: parsed.data.userAgentHash ?? null
  });

  if (error || !isRecord(data)) {
    await recordNewsletterFailure(recordOperationalFailure, {
      action: 'newsletter_subscribe',
      errorCode: 'newsletter_subscribe_failed',
      summary: 'Newsletter subscribe failed',
      market: parsed.data.market
    });
    return {status: 'error'};
  }
  if (data.status === 'subscribed' || data.status === 'resubscribed') {
    return {status: 'subscribed'};
  }
  if (data.status === 'invalid') {
    return {status: 'invalid'};
  }
  await recordNewsletterFailure(recordOperationalFailure, {
    action: 'newsletter_subscribe',
    errorCode: 'newsletter_subscribe_failed',
    summary: 'Newsletter subscribe returned an unexpected result',
    market: parsed.data.market
  });
  return {status: 'error'};
}

export async function unsubscribeNewsletter(
  {rawToken}: {rawToken: unknown},
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<NewsletterUnsubscribeResult> {
  if (typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/.test(rawToken)) {
    return {status: 'invalid'};
  }

  const {data, error} = await client.rpc('unsubscribe_newsletter', {
    p_token_hash: hashNewsletterUnsubscribeToken(rawToken)
  });
  if (error || !isRecord(data)) {
    await recordNewsletterFailure(recordOperationalFailure, {
      action: 'newsletter_unsubscribe',
      errorCode: 'newsletter_unsubscribe_failed',
      summary: 'Newsletter unsubscribe failed'
    });
    return {status: 'error'};
  }
  if (data.status === 'unsubscribed' || data.status === 'unavailable' || data.status === 'invalid') {
    return {status: data.status};
  }
  await recordNewsletterFailure(recordOperationalFailure, {
    action: 'newsletter_unsubscribe',
    errorCode: 'newsletter_unsubscribe_failed',
    summary: 'Newsletter unsubscribe returned an unexpected result'
  });
  return {status: 'error'};
}
