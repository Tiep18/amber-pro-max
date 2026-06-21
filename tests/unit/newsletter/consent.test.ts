import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {
  normalizeNewsletterEmail,
  shapeConsentMetadata,
  subscribeNewsletter
} from '@/newsletter/consent';

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
});
