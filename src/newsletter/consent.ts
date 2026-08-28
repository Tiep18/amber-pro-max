import 'server-only';

import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';
import {
  hashNewsletterUnsubscribeToken,
  normalizeNewsletterUnsubscribeToken
} from '@/newsletter/unsubscribe-token';

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
  targetHash: z.string().regex(/^[a-f0-9]{64}$/),
  ipHash: z.string().regex(/^[a-f0-9]{64}$/),
  userAgentHash: hashSchema
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeNewsletterEmail(value: string) {
  const parsed = emailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export type NewsletterSubscribeResult = {status: 'idle' | 'subscribed' | 'invalid' | 'error'};
export type NewsletterSubscribeOutcome = {
  result: NewsletterSubscribeResult;
  emailQueued: boolean;
};

export type NewsletterUnsubscribeResult = {status: 'unsubscribed' | 'unavailable' | 'invalid' | 'error'};

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
  await runMonitoredAction({
    area: 'application',
    action: input.action,
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: {status: 'error', code: input.errorCode},
    shouldRecordResult: () => true,
    facts: {
      market: input.market ?? null
    },
    recordOperationalFailure: recorder,
    operation: async () => ({status: 'error', code: input.errorCode})
  });
}

export async function subscribeNewsletterWithOutcome(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<NewsletterSubscribeOutcome> {
  const parsed = subscribeInputSchema.safeParse(input);
  if (!parsed.success) {
    return {result: {status: 'invalid'}, emailQueued: false};
  }

  const {data, error} = await client.rpc('subscribe_newsletter', {
    p_email: parsed.data.email,
    p_locale: parsed.data.locale,
    p_market: parsed.data.market,
    p_source: parsed.data.source,
    p_target_hash: parsed.data.targetHash,
    p_ip_hash: parsed.data.ipHash,
    p_user_agent_hash: parsed.data.userAgentHash ?? null
  });

  if (error || !isRecord(data)) {
    await recordNewsletterFailure(recordOperationalFailure, {
      action: 'newsletter_subscribe',
      errorCode: 'newsletter_subscribe_failed',
      summary: 'Newsletter subscribe failed',
      market: parsed.data.market
    });
    return {result: {status: 'error'}, emailQueued: false};
  }
  if (data.status === 'subscribed' || data.status === 'resubscribed') {
    return {result: {status: 'subscribed'}, emailQueued: data.emailQueued === true};
  }
  if (data.status === 'invalid') {
    return {result: {status: 'invalid'}, emailQueued: false};
  }
  await recordNewsletterFailure(recordOperationalFailure, {
    action: 'newsletter_subscribe',
    errorCode: 'newsletter_subscribe_failed',
    summary: 'Newsletter subscribe returned an unexpected result',
    market: parsed.data.market
  });
  return {result: {status: 'error'}, emailQueued: false};
}

export async function subscribeNewsletter(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<NewsletterSubscribeResult> {
  return (await subscribeNewsletterWithOutcome(input, client, recordOperationalFailure)).result;
}

export async function unsubscribeNewsletter(
  {rawToken}: {rawToken: unknown},
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<NewsletterUnsubscribeResult> {
  const newsletterToken = normalizeNewsletterUnsubscribeToken(rawToken);
  if (!newsletterToken) {
    return {status: 'invalid'};
  }

  const {data, error} = await client.rpc('unsubscribe_newsletter', {
    p_token_hash: hashNewsletterUnsubscribeToken(newsletterToken)
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
