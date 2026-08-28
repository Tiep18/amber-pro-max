import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {derivePublicEmailRequestEvidence} from '@/operations/public-request-evidence';

describe('public email request evidence', () => {
  const secret = '0123456789abcdef0123456789abcdef';

  test('derives stable domain-separated HMAC identities without retaining raw request data', () => {
    const input = {
      purpose: 'newsletter_subscribe' as const,
      subject: 'subscriber@example.test',
      ip: '203.0.113.10',
      userAgent: 'Example Browser/1.0'
    };
    const first = derivePublicEmailRequestEvidence(input, secret);
    const second = derivePublicEmailRequestEvidence(input, secret);
    const otherPurpose = derivePublicEmailRequestEvidence({...input, purpose: 'guest_order_reopen'}, secret);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      targetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      userAgentHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    expect(otherPurpose?.targetHash).not.toBe(first?.targetHash);
    expect(JSON.stringify(first)).not.toMatch(/subscriber@example|203\.0\.113\.10|Example Browser/i);
  });

  test('fails closed when the shared server secret is not delivery-ready', () => {
    expect(derivePublicEmailRequestEvidence({
      purpose: 'newsletter_subscribe',
      subject: 'subscriber@example.test',
      ip: null,
      userAgent: null
    }, 'too-short')).toBeNull();
  });
});
