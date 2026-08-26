import 'server-only';

import {createHash} from 'node:crypto';

declare const newsletterUnsubscribeTokenBrand: unique symbol;

export type NewsletterUnsubscribeToken = string & {
  readonly [newsletterUnsubscribeTokenBrand]: true;
};

const NEWSLETTER_UNSUBSCRIBE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function normalizeNewsletterUnsubscribeToken(
  value: unknown
): NewsletterUnsubscribeToken | null {
  return typeof value === 'string' && NEWSLETTER_UNSUBSCRIBE_TOKEN_PATTERN.test(value)
    ? (value as NewsletterUnsubscribeToken)
    : null;
}

export function hashNewsletterUnsubscribeToken(rawToken: NewsletterUnsubscribeToken) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
