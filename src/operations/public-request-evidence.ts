import 'server-only';

import {createHmac} from 'node:crypto';
import {isTransactionalEmailTokenSecretReady} from '@/fulfillment/email-token-secret';

const PUBLIC_EMAIL_RATE_LIMIT_DOMAIN = 'public-email-rate-limit:v1:';

export type PublicEmailRequestPurpose =
  | 'newsletter_subscribe'
  | 'guest_order_reopen'
  | 'guest_order_claim';

function hmac(secret: string, value: string) {
  return createHmac('sha256', secret).update(`${PUBLIC_EMAIL_RATE_LIMIT_DOMAIN}${value}`, 'utf8').digest('hex');
}

export function derivePublicEmailRequestEvidence(
  input: {
    purpose: PublicEmailRequestPurpose;
    subject: string;
    ip?: string | null;
    userAgent?: string | null;
  },
  secret: string | null | undefined
) {
  if (!isTransactionalEmailTokenSecretReady(secret)) {
    return null;
  }

  const subject = input.subject.trim().toLowerCase();
  if (!subject) {
    return null;
  }

  const ip = input.ip?.trim() || 'unavailable';
  const userAgent = input.userAgent?.trim() || 'unavailable';

  return {
    targetHash: hmac(secret, `target:${input.purpose}:${subject}`),
    ipHash: hmac(secret, `ip:${ip}`),
    userAgentHash: hmac(secret, `consent-user-agent:${userAgent}`)
  };
}
