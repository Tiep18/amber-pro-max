import {readFileSync} from 'node:fs';
import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {
  normalizeNewsletterEmail,
  createNewsletterUnsubscribeToken,
  hashNewsletterUnsubscribeToken,
  shapeConsentMetadata,
  subscribeNewsletter,
  unsubscribeNewsletter
} from '@/newsletter/consent';
import {renderTransactionalEmail} from '@/emails/transactional';

describe('newsletter consent contracts (NEWS-01, NEWS-02, D-13, D-16)', () => {
  test('normalizes email as the subscriber identity', () => {
    expect(normalizeNewsletterEmail('  Taylor.Customer@Example.COM ')).toBe('taylor.customer@example.com');
    expect(normalizeNewsletterEmail('not-an-email')).toBeNull();
  });

  test('shapes request evidence as hashes without retaining raw IP or user-agent', () => {
    const metadata = shapeConsentMetadata({ip: '203.0.113.10', userAgent: 'Example Browser/1.0'});

    expect(metadata.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.userAgentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(metadata)).not.toContain('203.0.113.10');
    expect(JSON.stringify(metadata)).not.toContain('Example Browser');
  });

  test('subscribes without account state and sends normalized locale/market/source evidence', async () => {
    const client = {rpc: vi.fn().mockResolvedValue({data: {status: 'subscribed'}, error: null})};

    await expect(subscribeNewsletter({
      email: ' Taylor@Example.com ',
      locale: 'en',
      market: 'intl',
      source: 'footer',
      ipHash: 'a'.repeat(64),
      userAgentHash: 'b'.repeat(64)
    }, client)).resolves.toEqual({status: 'subscribed'});

    expect(client.rpc).toHaveBeenCalledWith('subscribe_newsletter', {
      p_email: 'taylor@example.com',
      p_locale: 'en',
      p_market: 'intl',
      p_source: 'footer',
      p_ip_hash: 'a'.repeat(64),
      p_user_agent_hash: 'b'.repeat(64)
    });
  });

  test('returns the same safe success state for subscribe and resubscribe', async () => {
    const client = {
      rpc: vi.fn()
        .mockResolvedValueOnce({data: {status: 'subscribed'}, error: null})
        .mockResolvedValueOnce({data: {status: 'resubscribed'}, error: null})
    };
    const input = {email: 'taylor@example.com', locale: 'vi', market: 'vn', source: 'footer'} as const;

    await expect(subscribeNewsletter(input, client)).resolves.toEqual({status: 'subscribed'});
    await expect(subscribeNewsletter(input, client)).resolves.toEqual({status: 'subscribed'});
  });

  test('maps invalid input and database errors to generic safe states', async () => {
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private'}})};

    await expect(subscribeNewsletter({email: 'bad', locale: 'en', market: 'intl', source: 'footer'}, client)).resolves.toEqual({
      status: 'invalid'
    });
    await expect(subscribeNewsletter({email: 'valid@example.com', locale: 'en', market: 'intl', source: 'footer'}, client)).resolves.toEqual({
      status: 'error'
    });
  });

  test('records subscribe failures without exposing subscriber email or request hashes', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private subscriber detail'}})};

    await expect(subscribeNewsletter({
      email: ' Taylor@Example.com ',
      locale: 'en',
      market: 'intl',
      source: 'footer',
      ipHash: 'a'.repeat(64),
      userAgentHash: 'b'.repeat(64)
    }, client, recordOperationalFailure)).resolves.toEqual({status: 'error'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'newsletter_subscribe_failed',
        summary: 'Newsletter subscribe failed',
        facts: expect.objectContaining({
          action: 'newsletter_subscribe',
          market: 'intl',
          code: 'newsletter_subscribe_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/Taylor|example\.com|private subscriber|aaaaaaaa|bbbbbbbb|ipHash|userAgentHash/i);
  });

  test('keeps subscribe error result stable when operational recording fails', async () => {
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private subscriber detail'}})};

    await expect(subscribeNewsletter({
      email: ' Taylor@Example.com ',
      locale: 'en',
      market: 'intl',
      source: 'footer'
    }, client, recordOperationalFailure)).resolves.toEqual({status: 'error'});
  });
});

describe('newsletter unsubscribe contracts (NEWS-02, D-14, D-16)', () => {
  test('creates high-entropy raw tokens and stable SHA-256 hashes', () => {
    const rawToken = createNewsletterUnsubscribeToken();

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(hashNewsletterUnsubscribeToken(rawToken)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashNewsletterUnsubscribeToken(rawToken)).toBe(hashNewsletterUnsubscribeToken(rawToken));
    expect(hashNewsletterUnsubscribeToken(rawToken)).not.toBe(rawToken);
  });

  test('valid unsubscribe hashes the raw token and maps success', async () => {
    const rawToken = 'a'.repeat(64);
    const client = {rpc: vi.fn().mockResolvedValue({data: {status: 'unsubscribed'}, error: null})};

    await expect(unsubscribeNewsletter({rawToken}, client)).resolves.toEqual({status: 'unsubscribed'});
    expect(client.rpc).toHaveBeenCalledWith('unsubscribe_newsletter', {
      p_token_hash: hashNewsletterUnsubscribeToken(rawToken)
    });
  });

  test('expired and consumed tokens share a generic unavailable result', async () => {
    const client = {rpc: vi.fn().mockResolvedValue({data: {status: 'unavailable'}, error: null})};

    await expect(unsubscribeNewsletter({rawToken: 'b'.repeat(64)}, client)).resolves.toEqual({status: 'unavailable'});
  });

  test('invalid raw token returns invalid without querying subscriber state', async () => {
    const client = {rpc: vi.fn()};

    await expect(unsubscribeNewsletter({rawToken: 'short'}, client)).resolves.toEqual({status: 'invalid'});
    expect(client.rpc).not.toHaveBeenCalled();
  });

  test('records unsubscribe failures without exposing raw token or token hash', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const rawToken = 'c'.repeat(64);
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private token detail'}})};

    await expect(unsubscribeNewsletter({rawToken}, client, recordOperationalFailure)).resolves.toEqual({status: 'error'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'newsletter_unsubscribe_failed',
        summary: 'Newsletter unsubscribe failed',
        facts: expect.objectContaining({
          action: 'newsletter_unsubscribe',
          code: 'newsletter_unsubscribe_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(new RegExp(`${rawToken}|${hashNewsletterUnsubscribeToken(rawToken)}|private token|token`, 'i'));
  });

  test('renders localized subscribe confirmation with one-click unsubscribe URL', () => {
    const email = renderTransactionalEmail({
      id: 'newsletter-email-1',
      eventType: 'newsletter_subscribed' as never,
      recipientEmail: 'subscriber@example.test',
      locale: 'vi',
      orderId: null,
      entitlementId: null,
      payload: {}
    }, {
      siteUrl: 'https://shop.example.test',
      newsletterToken: 'raw-newsletter-token'
    } as never);

    expect(email.subject).toContain('ban tin');
    expect(email.html).toContain('/vi/ban-tin/huy-dang-ky?token=raw-newsletter-token');
    expect(email.text).not.toContain('token_hash');
  });

  test('newsletter public actions do not require authentication', () => {
    const source = readFileSync('src/newsletter/actions.ts', 'utf8');
    expect(source).not.toMatch(/requireUser|requireAdmin/);
  });
});
