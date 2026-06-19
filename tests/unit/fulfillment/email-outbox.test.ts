import {describe, expect, test, vi} from 'vitest';
import {POST} from '@/app/api/fulfillment/email-outbox/route';
import {processTransactionalEmailBatch} from '@/fulfillment/email-outbox';
import {renderTransactionalEmail} from '@/emails/transactional';

const now = new Date('2026-06-19T10:00:00.000Z');

const digitalRow = {
  id: 'email-1',
  eventType: 'digital_access_granted' as const,
  recipientEmail: 'buyer@example.test',
  locale: 'en' as const,
  orderId: 'order-1',
  entitlementId: 'entitlement-1',
  payload: {orderNumber: 'ATB-20260619-0001', expiresInHours: 24}
};

describe('transactional email renderer', () => {
  test('renders localized download email with app token link and no PDF attachment URL', () => {
    const email = renderTransactionalEmail(digitalRow, {
      siteUrl: 'https://shop.example.test',
      downloadToken: 'raw-download-token',
      expiresAt: new Date(now.getTime() + 86_400_000)
    });

    expect(email.subject).toContain('PDF');
    expect(email.html).toContain('/api/downloads?');
    expect(email.html).toContain('token=raw-download-token');
    expect(email.text).toContain('24 hours');
    expect(JSON.stringify(email)).not.toMatch(/signedUrl|signed_url|pattern-pdfs|object_path|attachment/i);
  });

  test('renders Vietnamese guest and physical fulfillment messages', () => {
    const guest = renderTransactionalEmail(
      {
        id: 'email-2',
        eventType: 'guest_order_claim',
        recipientEmail: 'buyer@example.test',
        locale: 'vi',
        orderId: 'order-1',
        entitlementId: null,
        payload: {orderNumber: 'ATB-20260619-0001'}
      },
      {siteUrl: 'https://shop.example.test', guestToken: 'guest-token', expiresAt: new Date(now.getTime() + 86_400_000)}
    );
    const shipped = renderTransactionalEmail(
      {
        id: 'email-3',
        eventType: 'physical_shipped',
        recipientEmail: 'buyer@example.test',
        locale: 'vi',
        orderId: 'order-1',
        entitlementId: null,
        payload: {orderNumber: 'ATB-20260619-0001', carrier: 'VNPost', trackingNumber: 'TRACK123', trackingUrl: 'https://tracking.example.test/TRACK123'}
      },
      {siteUrl: 'https://shop.example.test'}
    );

    expect(guest.subject).toContain('don hang');
    expect(guest.html).toContain('guest-token');
    expect(shipped.text).toContain('VNPost');
    expect(shipped.html).toContain('https://tracking.example.test/TRACK123');
  });
});

describe('transactional email outbox worker', () => {
  test('claims due rows, sends with idempotency keys, retries transient failures, and marks permanent failures', async () => {
    const repository = {
      claimDueRows: vi.fn().mockResolvedValue([
        digitalRow,
        {...digitalRow, id: 'email-2', recipientEmail: 'retry@example.test'},
        {...digitalRow, id: 'email-3', recipientEmail: 'bad@example.test'}
      ]),
      issueDownloadToken: vi.fn().mockResolvedValue({rawToken: 'raw-download-token', expiresAt: new Date(now.getTime() + 86_400_000).toISOString()}),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi
        .fn()
        .mockResolvedValueOnce({status: 'sent', providerMessageId: 'resend_1'})
        .mockResolvedValueOnce({status: 'retry', code: 'rate_limited'})
        .mockResolvedValueOnce({status: 'failed', code: 'invalid_recipient'})
    };

    const result = await processTransactionalEmailBatch({
      repository,
      sender,
      now: () => now,
      config: {siteUrl: 'https://shop.example.test', fromEmail: 'orders@example.test', batchSize: 5}
    });

    expect(result).toEqual({status: 'processed', claimed: 3, sent: 1, retry: 1, failed: 1});
    expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({idempotencyKey: 'transactional-email:email-1'}));
    expect(repository.markSent).toHaveBeenCalledWith('email-1', 'resend_1', now);
    expect(repository.markRetry).toHaveBeenCalledWith('email-2', 'rate_limited', expect.any(Date));
    expect(repository.markFailed).toHaveBeenCalledWith('email-3', 'invalid_recipient', now);
  });

  test('returns unconfigured without claiming rows when sender config is missing', async () => {
    const repository = {claimDueRows: vi.fn()};

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender: {send: vi.fn()},
      now: () => now,
      config: {siteUrl: 'https://shop.example.test', fromEmail: null, batchSize: 5}
    });

    expect(result).toEqual({status: 'unconfigured', code: 'missing_transactional_email_config'});
    expect(repository.claimDueRows).not.toHaveBeenCalled();
  });
});

describe('transactional email worker route', () => {
  test('rejects missing or wrong worker secret', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('TRANSACTIONAL_EMAIL_WORKER_SECRET', 'correct-secret');

    const missing = await POST(new Request('https://shop.example.test/api/fulfillment/email-outbox', {method: 'POST'}));
    const wrong = await POST(
      new Request('https://shop.example.test/api/fulfillment/email-outbox', {
        method: 'POST',
        headers: {authorization: 'Bearer wrong-secret'}
      })
    );

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });
});
