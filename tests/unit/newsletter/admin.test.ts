import {describe, expect, test, vi} from 'vitest';

import {getAdminNewsletterSubscribers} from '@/newsletter/admin-queries';

function createQuery(data: unknown[]) {
  const query = {
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({data, error: null}))
  };
  return query;
}

describe('newsletter admin queries (NEWS-03, D-15, D-16)', () => {
  test('requires admin before querying subscriber state and maps filters', async () => {
    const requireAdmin = vi.fn(async () => ({id: 'admin-user'}));
    const subscriberQuery = createQuery([
      {
        normalized_email: 'reader@example.test',
        status: 'subscribed',
        latest_locale: 'en',
        latest_market: 'intl',
        subscribed_at: '2026-06-21T10:00:00.000Z',
        unsubscribed_at: null,
        updated_at: '2026-06-21T10:00:00.000Z'
      }
    ]);
    const consentQuery = createQuery([
      {
        normalized_email: 'reader@example.test',
        event_type: 'subscribe',
        consent_source: 'footer',
        occurred_at: '2026-06-21T10:00:00.000Z',
        ip_hash: 'a'.repeat(64),
        user_agent_hash: null
      }
    ]);
    const from = vi.fn((table: string) => ({select: vi.fn(() => table === 'newsletter_subscribers' ? subscriberQuery : consentQuery)}));

    const result = await getAdminNewsletterSubscribers({
      client: {from} as never,
      requireAdmin,
      filters: {status: 'subscribed', locale: 'en', market: 'intl', search: 'reader'}
    });

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith('newsletter_subscribers');
    expect(subscriberQuery.eq).toHaveBeenCalledWith('status', 'subscribed');
    expect(subscriberQuery.eq).toHaveBeenCalledWith('latest_locale', 'en');
    expect(subscriberQuery.eq).toHaveBeenCalledWith('latest_market', 'intl');
    expect(subscriberQuery.ilike).toHaveBeenCalledWith('normalized_email', '%reader%');
    expect(consentQuery.in).toHaveBeenCalledWith('normalized_email', ['reader@example.test']);
    expect(result).toMatchObject({
      status: 'success',
      subscribers: [
        {
          email: 'reader@example.test',
          status: 'subscribed',
          latestLocale: 'en',
          latestMarket: 'intl',
          latestConsent: {
            eventType: 'subscribe',
            source: 'footer',
            hasIpEvidence: true,
            hasUserAgentEvidence: false
          }
        }
      ]
    });
  });

  test('returns redacted metadata indicators without token or request hashes', async () => {
    const requireAdmin = vi.fn(async () => ({id: 'admin-user'}));
    const subscriberQuery = createQuery([
      {
        normalized_email: 'privacy@example.test',
        status: 'unsubscribed',
        latest_locale: 'vi',
        latest_market: 'vn',
        subscribed_at: '2026-06-21T10:00:00.000Z',
        unsubscribed_at: '2026-06-21T11:00:00.000Z',
        updated_at: '2026-06-21T11:00:00.000Z'
      }
    ]);
    const consentQuery = createQuery([
      {
        normalized_email: 'privacy@example.test',
        event_type: 'unsubscribe',
        consent_source: 'email_link',
        occurred_at: '2026-06-21T11:00:00.000Z',
        ip_hash: 'b'.repeat(64),
        user_agent_hash: 'c'.repeat(64)
      }
    ]);
    const from = vi.fn((table: string) => ({select: vi.fn(() => table === 'newsletter_subscribers' ? subscriberQuery : consentQuery)}));

    const result = await getAdminNewsletterSubscribers({client: {from} as never, requireAdmin, filters: {}});
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('b'.repeat(64));
    expect(serialized).not.toContain('c'.repeat(64));
    expect(serialized).not.toMatch(/token_hash|raw_ip|user_agent_hash|ip_hash/i);
    expect(result).toMatchObject({
      status: 'success',
      subscribers: [
        {
          latestConsent: {
            eventType: 'unsubscribe',
            source: 'email_link',
            hasIpEvidence: true,
            hasUserAgentEvidence: true
          }
        }
      ]
    });
  });
});
