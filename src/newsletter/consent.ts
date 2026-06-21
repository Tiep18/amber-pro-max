import 'server-only';

import {createHash} from 'node:crypto';
import {z} from 'zod';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

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

export async function subscribeNewsletter(input: unknown, client: RpcClient): Promise<NewsletterSubscribeResult> {
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
    return {status: 'error'};
  }
  return data.status === 'subscribed' || data.status === 'resubscribed'
    ? {status: 'subscribed'}
    : data.status === 'invalid'
      ? {status: 'invalid'}
      : {status: 'error'};
}
