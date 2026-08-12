import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { POST } from '@/app/api/fulfillment/email-outbox/route';
import {
  buildDownloadResendIntent,
  maskEmailForAdmin,
  sanitizeEmailFailureCode,
  validateRetryCandidate
} from '@/fulfillment/admin-email-actions';
import {
  deriveTransactionalEmailToken,
  processTransactionalEmailBatch
} from '@/fulfillment/email-outbox';
import {
  createSupabaseEmailOutboxRepository,
  triggerTransactionalEmailOutboxNow
} from '@/fulfillment/email-outbox.server';
import { renderTransactionalEmail } from '@/emails/transactional';

const now = new Date('2026-06-19T10:00:00.000Z');
const transactionalEmailTokenSecret = '0123456789abcdef0123456789abcdef';

const digitalRow = {
  id: 'email-1',
  claimToken: '10000000-0000-4000-8000-000000000001',
  createdAt: now.toISOString(),
  eventType: 'digital_access_granted' as const,
  recipientEmail: 'buyer@example.test',
  locale: 'en' as const,
  orderId: 'order-1',
  entitlementId: 'entitlement-1',
  payload: { orderNumber: 'ATB-20260619-0001', expiresInHours: 24 }
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
    expect(JSON.stringify(email)).not.toMatch(
      /signedUrl|signed_url|pattern-pdfs|object_path|attachment/i
    );
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
        payload: { orderNumber: 'ATB-20260619-0001' }
      },
      {
        siteUrl: 'https://shop.example.test',
        guestToken: 'guest-token',
        expiresAt: new Date(now.getTime() + 86_400_000)
      }
    );
    const shipped = renderTransactionalEmail(
      {
        id: 'email-3',
        eventType: 'physical_shipped',
        recipientEmail: 'buyer@example.test',
        locale: 'vi',
        orderId: 'order-1',
        entitlementId: null,
        payload: {
          orderNumber: 'ATB-20260619-0001',
          carrier: 'VNPost',
          trackingNumber: 'TRACK123',
          trackingUrl: 'https://tracking.example.test/TRACK123'
        }
      },
      { siteUrl: 'https://shop.example.test' }
    );

    expect(guest.subject).toContain('đơn hàng');
    expect(guest.html).toContain('guest-token');
    expect(shipped.text).toContain('VNPost');
    expect(shipped.html).toContain('https://tracking.example.test/TRACK123');
  });

  test('renders the order_created reopen link through the token redemption route, not the order page directly', () => {
    const row = {
      id: 'email-order-created',
      eventType: 'order_created' as const,
      recipientEmail: 'buyer@example.test',
      locale: 'en' as const,
      orderId: 'order-1',
      entitlementId: null,
      payload: {
        orderNumber: 'ATB-20260619-0002',
        totalMinor: 4250,
        currencyCode: 'USD',
        paymentIntent: 'paypal_intent',
        reservationExpiresAt: '2026-06-19T10:25:00.000Z'
      }
    };

    const email = renderTransactionalEmail(row, {
      siteUrl: 'https://shop.example.test',
      guestToken: 'reopen-raw-token'
    });

    expect(email.subject).toContain('ATB-20260619-0002');
    expect(email.html).toContain('/api/orders/access?');
    expect(email.html).toContain('token=reopen-raw-token');
    expect(email.html).toContain('$42.50');
    expect(JSON.stringify(email)).not.toMatch(/signedUrl|signed_url|guest_secret_hash/i);
  });

  test('renders complete VietQR transfer details as text for order_created so the customer can pay without the QR image', () => {
    const row = {
      id: 'email-order-created-vietqr',
      eventType: 'order_created' as const,
      recipientEmail: 'buyer@example.test',
      locale: 'vi' as const,
      orderId: 'order-2',
      entitlementId: null,
      payload: {
        orderNumber: 'ATB-20260619-0003',
        totalMinor: 250000,
        currencyCode: 'VND',
        paymentIntent: 'vietqr_intent',
        reservationExpiresAt: '2026-06-20T10:00:00.000Z',
        isGuest: true
      }
    };

    const email = renderTransactionalEmail(row, {
      siteUrl: 'https://shop.example.test',
      guestToken: 'reopen-raw-token',
      vietqr: {
        bankId: 'MBBank',
        accountName: 'AMBERTINYBEAR STUDIO',
        accountNoMasked: '****4321',
        qrImageUrl: 'https://img.vietqr.io/image/MBBank-1234-compact.png'
      }
    });

    expect(email.text).toContain('MBBank');
    expect(email.text).toContain('AMBERTINYBEAR STUDIO');
    expect(email.text).toContain('****4321');
    expect(email.text).toContain('ATB-20260619-0003');
    expect(JSON.stringify(email)).not.toMatch(/qrImageUrl|accountNo[^M]|signed_url/i);
  });

  test('order_created falls back to the plain order page when no reopen token could be issued', () => {
    const row = {
      id: 'email-order-created-no-token',
      eventType: 'order_created' as const,
      recipientEmail: 'buyer@example.test',
      locale: 'en' as const,
      orderId: 'order-3',
      entitlementId: null,
      payload: {
        orderNumber: 'ATB-20260619-0004',
        totalMinor: 1000,
        currencyCode: 'USD',
        paymentIntent: 'paypal_intent'
      }
    };

    const email = renderTransactionalEmail(row, {
      siteUrl: 'https://shop.example.test',
      guestToken: null
    });

    expect(email.html).not.toContain('/api/orders/access');
    expect(email.html).toContain('/en/orders/ATB-20260619-0004');
  });

  test('renders payment_received with next steps for a mixed digital and physical order', () => {
    const row = {
      id: 'email-payment-received',
      eventType: 'payment_received' as const,
      recipientEmail: 'buyer@example.test',
      locale: 'vi' as const,
      orderId: 'order-4',
      entitlementId: null,
      payload: {
        orderNumber: 'ATB-20260619-0005',
        totalMinor: 500000,
        currencyCode: 'VND',
        hasDigitalLines: true,
        hasPhysicalLines: true
      }
    };

    const email = renderTransactionalEmail(row, { siteUrl: 'https://shop.example.test' });

    expect(email.subject).toContain('ATB-20260619-0005');
    expect(email.text).toContain('PDF');
    expect(email.text).toContain('đóng gói');
    expect(email.html).toContain('/vi/don-hang/ATB-20260619-0005');
  });

  test('renders payment_received with digital-only next steps', () => {
    const row = {
      id: 'email-payment-received-digital',
      eventType: 'payment_received' as const,
      recipientEmail: 'buyer@example.test',
      locale: 'en' as const,
      orderId: 'order-5',
      entitlementId: null,
      payload: {
        orderNumber: 'ATB-20260619-0006',
        totalMinor: 1500,
        currencyCode: 'USD',
        hasDigitalLines: true,
        hasPhysicalLines: false
      }
    };

    const email = renderTransactionalEmail(row, { siteUrl: 'https://shop.example.test' });

    expect(email.text).toContain('separate email');
    expect(email.text).not.toContain('packed and shipped');
  });
});

describe('transactional email outbox worker', () => {
  test('derives a stable, domain-separated bearer token for each outbox capability', () => {
    const outboxId = '10000000-0000-4000-8000-000000000001';
    const capabilities = [
      'digital_download',
      'guest_reopen_order',
      'guest_claim_order',
      'newsletter_unsubscribe'
    ] as const;
    const derivedTokens = capabilities.map((purpose) =>
      deriveTransactionalEmailToken(transactionalEmailTokenSecret, outboxId, purpose)
    );

    expect(derivedTokens[0]).toBe('jQpPiXJbwNfY2C3g0L5JLVcoVHjSNh1pD-5DC97QWVU');
    expect(new Set(derivedTokens).size).toBe(capabilities.length);
    expect(
      deriveTransactionalEmailToken(transactionalEmailTokenSecret, outboxId, 'digital_download')
    ).toBe('jQpPiXJbwNfY2C3g0L5JLVcoVHjSNh1pD-5DC97QWVU');
    expect(
      deriveTransactionalEmailToken(
        transactionalEmailTokenSecret,
        '20000000-0000-4000-8000-000000000001',
        'digital_download'
      )
    ).not.toBe('jQpPiXJbwNfY2C3g0L5JLVcoVHjSNh1pD-5DC97QWVU');
  });

  test('rejects missing or weak token secrets before deriving a bearer capability', () => {
    expect(() =>
      deriveTransactionalEmailToken(undefined, digitalRow.id, 'digital_download')
    ).toThrow('transactional email token signing is unavailable');
    expect(() =>
      deriveTransactionalEmailToken('too-short', digitalRow.id, 'digital_download')
    ).toThrow('transactional email token signing is unavailable');
  });

  test('fails closed before persistence or send when a tokenized email has no signing secret', async () => {
    const repository = {
      claimDueRows: vi.fn().mockResolvedValue([digitalRow]),
      issueDownloadToken: vi.fn(),
      issueGuestToken: vi.fn(),
      markSent: vi.fn(),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn()
    };
    const sender = { send: vi.fn() };

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender,
      config: { siteUrl: 'https://shop.example.test', fromEmail: 'orders@example.test' },
      now: () => now
    });

    expect(result).toEqual({ status: 'processed', claimed: 1, sent: 0, retry: 1, failed: 0 });
    expect(repository.issueDownloadToken).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
    expect(repository.markRetry).toHaveBeenCalledWith(
      { id: digitalRow.id, claimToken: digitalRow.claimToken },
      'email_token_preparation_failed',
      new Date('2026-06-19T10:15:00.000Z')
    );
  });

  test('sends non-tokenized email without requiring the token signing secret', async () => {
    const row = {
      ...digitalRow,
      id: 'email-physical-shipped',
      eventType: 'physical_shipped' as const,
      entitlementId: null,
      payload: { orderNumber: 'ATB-20260619-0001', carrier: 'VNPost', trackingNumber: 'TRACK123' }
    };
    const repository = {
      claimDueRows: vi.fn().mockResolvedValue([row]),
      issueDownloadToken: vi.fn(),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn(),
      markFailed: vi.fn()
    };
    const sender = {
      send: vi.fn().mockResolvedValue({ status: 'sent', providerMessageId: 'resend-physical' })
    };

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender,
      config: { siteUrl: 'https://shop.example.test', fromEmail: 'orders@example.test' },
      now: () => now
    });

    expect(result).toEqual({ status: 'processed', claimed: 1, sent: 1, retry: 0, failed: 0 });
    expect(sender.send).toHaveBeenCalledOnce();
    expect(repository.issueDownloadToken).not.toHaveBeenCalled();
    expect(repository.issueGuestToken).not.toHaveBeenCalled();
  });

  test('reuses the same prepared download link and Resend payload when a row retries later', async () => {
    const outboxId = '20000000-0000-4000-8000-000000000001';
    const createdAt = '2026-06-19T09:00:00.000Z';
    const firstClaim = {
      ...digitalRow,
      id: outboxId,
      claimToken: '10000000-0000-4000-8000-000000000002',
      createdAt
    };
    const retryClaim = {
      ...firstClaim,
      claimToken: '10000000-0000-4000-8000-000000000003',
      attemptCount: 2
    };
    const expectedToken = 'krMVmeILCZGckZNphm9WMoTRMo3dHnoe4wNDZvpyICs';
    const expectedExpiry = '2026-06-20T09:00:00.000Z';
    const repository = {
      claimDueRows: vi.fn().mockResolvedValueOnce([firstClaim]).mockResolvedValueOnce([retryClaim]),
      issueDownloadToken: vi.fn(async (_row, preparation) => ({
        expiresAt: preparation.expiresAt
      })),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ status: 'retry', code: 'rate_limited' })
        .mockResolvedValueOnce({ status: 'sent', providerMessageId: 'resend_1' })
    };
    const config = {
      siteUrl: 'https://shop.example.test',
      fromEmail: 'orders@example.test',
      tokenSecret: transactionalEmailTokenSecret
    };

    await processTransactionalEmailBatch({
      repository,
      sender,
      config,
      now: () => new Date('2026-06-19T10:00:00.000Z')
    });
    await processTransactionalEmailBatch({
      repository,
      sender,
      config,
      now: () => new Date('2026-06-19T10:15:00.000Z')
    });

    expect(repository.issueDownloadToken).toHaveBeenNthCalledWith(1, firstClaim, {
      rawToken: expectedToken,
      expiresAt: expectedExpiry,
      sourceEmailOutboxId: outboxId
    });
    expect(repository.issueDownloadToken).toHaveBeenNthCalledWith(2, retryClaim, {
      rawToken: expectedToken,
      expiresAt: expectedExpiry,
      sourceEmailOutboxId: outboxId
    });
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sender.send.mock.calls[0][0]).toEqual(sender.send.mock.calls[1][0]);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `transactional-email:${outboxId}`,
        html: expect.stringContaining(`token=${expectedToken}`),
        text: expect.stringContaining(`token=${expectedToken}`)
      })
    );
  });

  test('claims due rows, sends with idempotency keys, retries transient failures, and marks permanent failures', async () => {
    const repository = {
      claimDueRows: vi
        .fn()
        .mockResolvedValue([
          digitalRow,
          { ...digitalRow, id: 'email-2', recipientEmail: 'retry@example.test' },
          { ...digitalRow, id: 'email-3', recipientEmail: 'bad@example.test' }
        ]),
      issueDownloadToken: vi
        .fn()
        .mockResolvedValue({
          rawToken: 'raw-download-token',
          expiresAt: new Date(now.getTime() + 86_400_000).toISOString()
        }),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ status: 'sent', providerMessageId: 'resend_1' })
        .mockResolvedValueOnce({ status: 'retry', code: 'rate_limited' })
        .mockResolvedValueOnce({ status: 'failed', code: 'invalid_recipient' })
    };

    const result = await processTransactionalEmailBatch({
      repository,
      sender,
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    expect(result).toEqual({ status: 'processed', claimed: 3, sent: 1, retry: 1, failed: 1 });
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'transactional-email:email-1' })
    );
    expect(repository.markSent).toHaveBeenCalledWith(
      { id: 'email-1', claimToken: digitalRow.claimToken },
      'resend_1',
      now
    );
    expect(repository.markRetry).toHaveBeenCalledWith(
      { id: 'email-2', claimToken: digitalRow.claimToken },
      'rate_limited',
      expect.any(Date)
    );
    expect(repository.markFailed).toHaveBeenCalledWith(
      { id: 'email-3', claimToken: digitalRow.claimToken },
      'invalid_recipient',
      now
    );
  });

  test('returns unconfigured without claiming rows when sender config is missing', async () => {
    const repository = { claimDueRows: vi.fn() };

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender: { send: vi.fn() },
      now: () => now,
      config: { siteUrl: 'https://shop.example.test', fromEmail: null, batchSize: 5 }
    });

    expect(result).toEqual({ status: 'unconfigured', code: 'missing_transactional_email_config' });
    expect(repository.claimDueRows).not.toHaveBeenCalled();
  });

  test('records operational failures for retry, permanent failure, and worker exceptions without recipient PII', async () => {
    const repository = {
      claimDueRows: vi.fn().mockResolvedValue([
        { ...digitalRow, id: 'email-retry', orderId: 'order-retry' },
        { ...digitalRow, id: 'email-failed', orderId: 'order-failed' },
        {
          ...digitalRow,
          id: 'email-exception',
          recipientEmail: 'boom@example.test',
          orderId: 'order-exception'
        }
      ]),
      issueDownloadToken: vi
        .fn()
        .mockResolvedValueOnce({
          rawToken: 'retry-token',
          expiresAt: new Date(now.getTime() + 86_400_000).toISOString()
        })
        .mockResolvedValueOnce({
          rawToken: 'failed-token',
          expiresAt: new Date(now.getTime() + 86_400_000).toISOString()
        })
        .mockRejectedValueOnce(new Error('token issue failed for boom@example.test')),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ status: 'retry', code: 'rate_limited' })
        .mockResolvedValueOnce({ status: 'failed', code: 'invalid_recipient' })
    };
    const operationalFailureRecorder = vi
      .fn()
      .mockResolvedValue({ status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001' });

    const result = await processTransactionalEmailBatch({
      repository,
      sender,
      operationalFailureRecorder,
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    // A worker exception is transient (dropped connection, provider timeout,
    // token-minting hiccup) and is retried rather than burned, so this batch
    // is two retries and one permanent failure.
    expect(result).toEqual({ status: 'processed', claimed: 3, sent: 0, retry: 2, failed: 1 });
    expect(operationalFailureRecorder).toHaveBeenCalledTimes(3);
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'warning',
        errorCode: 'rate_limited',
        summary: 'Transactional email send scheduled for retry',
        facts: expect.objectContaining({
          emailType: 'digital_access_granted',
          orderId: 'order-retry'
        })
      })
    );
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'error',
        errorCode: 'invalid_recipient',
        summary: 'Transactional email send failed',
        facts: expect.objectContaining({
          emailType: 'digital_access_granted',
          orderId: 'order-failed'
        })
      })
    );
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'warning',
        errorCode: 'email_token_preparation_failed',
        summary: 'Transactional email token preparation failed, scheduled for retry',
        facts: expect.objectContaining({
          emailType: 'digital_access_granted',
          orderId: 'order-exception'
        })
      })
    );
    expect(JSON.stringify(operationalFailureRecorder.mock.calls)).not.toMatch(
      /buyer@example\.test|boom@example\.test|retry-token|failed-token/i
    );
  });

  test('retries a transient worker exception instead of burning the email on the first failure', async () => {
    const repository = {
      claimDueRows: vi
        .fn()
        .mockResolvedValue([
          { ...digitalRow, id: 'email-transient', orderId: 'order-transient', attemptCount: 1 }
        ]),
      issueDownloadToken: vi.fn().mockRejectedValue(new Error('provider timeout')),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender: { send: vi.fn() },
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    expect(result).toMatchObject({ retry: 1, failed: 0 });
    expect(repository.markRetry).toHaveBeenCalledWith(
      { id: 'email-transient', claimToken: digitalRow.claimToken },
      'email_token_preparation_failed',
      expect.any(Date)
    );
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  test('gives up on a transient exception once the attempt budget is exhausted', async () => {
    const repository = {
      claimDueRows: vi
        .fn()
        .mockResolvedValue([
          { ...digitalRow, id: 'email-exhausted', orderId: 'order-exhausted', attemptCount: 5 }
        ]),
      issueDownloadToken: vi.fn().mockRejectedValue(new Error('provider timeout')),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };

    const result = await processTransactionalEmailBatch({
      repository: repository as never,
      sender: { send: vi.fn() },
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    expect(result).toMatchObject({ retry: 0, failed: 1 });
    expect(repository.markFailed).toHaveBeenCalledWith(
      { id: 'email-exhausted', claimToken: digitalRow.claimToken },
      'email_token_preparation_failed',
      now
    );
    expect(repository.markRetry).not.toHaveBeenCalled();
  });

  test('marks a provider-declared retry as failed when the attempt budget is exhausted', async () => {
    const repository = {
      claimDueRows: vi
        .fn()
        .mockResolvedValue([{ ...digitalRow, id: 'email-provider-exhausted', attemptCount: 5 }]),
      issueDownloadToken: vi.fn().mockResolvedValue({
        rawToken: 'retry-token',
        expiresAt: new Date(now.getTime() + 86_400_000).toISOString()
      }),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };

    const result = await processTransactionalEmailBatch({
      repository,
      sender: { send: vi.fn().mockResolvedValue({ status: 'retry', code: 'rate_limited' }) },
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    expect(result).toEqual({ status: 'processed', claimed: 1, sent: 0, retry: 0, failed: 1 });
    expect(repository.markFailed).toHaveBeenCalledWith(
      { id: 'email-provider-exhausted', claimToken: digitalRow.claimToken },
      'rate_limited',
      now
    );
    expect(repository.markRetry).not.toHaveBeenCalled();
  });

  test('keeps email worker counts stable when operational recording fails', async () => {
    const repository = {
      claimDueRows: vi
        .fn()
        .mockResolvedValue([{ ...digitalRow, id: 'email-retry', orderId: 'order-retry' }]),
      issueDownloadToken: vi
        .fn()
        .mockResolvedValue({
          rawToken: 'retry-token',
          expiresAt: new Date(now.getTime() + 86_400_000).toISOString()
        }),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi.fn().mockResolvedValueOnce({ status: 'retry', code: 'rate_limited' })
    };
    const operationalFailureRecorder = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });

    const result = await processTransactionalEmailBatch({
      repository,
      sender,
      operationalFailureRecorder,
      now: () => now,
      config: {
        siteUrl: 'https://shop.example.test',
        fromEmail: 'orders@example.test',
        tokenSecret: transactionalEmailTokenSecret,
        batchSize: 5
      }
    });

    expect(result).toEqual({ status: 'processed', claimed: 1, sent: 0, retry: 1, failed: 0 });
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  test('immediate paid trigger is a safe no-op when transactional email is unconfigured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('RESEND_API_KEY', undefined);
    vi.stubEnv('RESEND_FROM_EMAIL', undefined);

    await expect(
      triggerTransactionalEmailOutboxNow({ reason: 'paypal_webhook_paid' })
    ).resolves.toEqual({
      status: 'unconfigured',
      code: 'missing_transactional_email_config'
    });
  });
});

describe('Supabase transactional email outbox repository', () => {
  test('maps claim ownership and passes it to the fenced transition RPC', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: '20000000-0000-4000-8000-000000000001',
            event_type: 'digital_access_granted',
            recipient_email: 'buyer@example.test',
            locale: 'en',
            order_id: '30000000-0000-4000-8000-000000000001',
            entitlement_id: '40000000-0000-4000-8000-000000000001',
            payload: { orderNumber: 'ATB-20260619-0001' },
            attempt_count: 1,
            claim_token: '50000000-0000-4000-8000-000000000001',
            created_at: '2026-06-19T09:00:00.000Z'
          }
        ],
        error: null
      })
      .mockResolvedValueOnce({ data: true, error: null });
    const repository = createSupabaseEmailOutboxRepository({ rpc, from: vi.fn() } as never);

    const [row] = await repository.claimDueRows(1, now);
    expect(row).toMatchObject({
      id: '20000000-0000-4000-8000-000000000001',
      claimToken: '50000000-0000-4000-8000-000000000001',
      attemptCount: 1,
      createdAt: '2026-06-19T09:00:00.000Z'
    });

    await repository.markSent({ id: row.id, claimToken: row.claimToken }, 'resend_1', now);

    expect(rpc).toHaveBeenLastCalledWith('transition_transactional_email_claim', {
      p_id: row.id,
      p_claim_token: row.claimToken,
      p_status: 'sent',
      p_provider_message_id: 'resend_1',
      p_error_code: null,
      p_available_at: null,
      p_transitioned_at: now.toISOString()
    });
  });

  test('throws on claim errors, malformed claim rows, transition errors, and lost ownership', async () => {
    const claimErrorRepository = createSupabaseEmailOutboxRepository({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } })
    } as never);
    await expect(claimErrorRepository.claimDueRows(1, now)).rejects.toThrow(
      'claim_transactional_emails failed'
    );

    const malformedRepository = createSupabaseEmailOutboxRepository({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({
        data: [{ id: '20000000-0000-4000-8000-000000000001' }],
        error: null
      })
    } as never);
    await expect(malformedRepository.claimDueRows(1, now)).rejects.toThrow(
      'claim_transactional_emails returned a malformed row'
    );

    const transitionErrorRepository = createSupabaseEmailOutboxRepository({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } })
    } as never);
    await expect(
      transitionErrorRepository.markFailed(
        {
          id: '20000000-0000-4000-8000-000000000001',
          claimToken: '50000000-0000-4000-8000-000000000001'
        },
        'provider_error',
        now
      )
    ).rejects.toThrow('transition_transactional_email_claim failed');

    const ownershipLostRepository = createSupabaseEmailOutboxRepository({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null })
    } as never);
    await expect(
      ownershipLostRepository.markFailed(
        {
          id: '20000000-0000-4000-8000-000000000001',
          claimToken: '50000000-0000-4000-8000-000000000001'
        },
        'provider_error',
        now
      )
    ).rejects.toThrow('transactional email claim ownership was lost');
  });

  test('reuses an exact source-linked download token without inserting a replacement', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: 'entitlement-1',
        token_hash: 'fc93c8c89a9169c6946642b2190685cc057e96c2d7e38923208a2acdab821bcb',
        purpose: 'download',
        status: 'active',
        expires_at: '2026-06-20T09:00:00.000Z'
      },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const insert = vi.fn();
    const from = vi.fn(() => ({ select, insert }));
    const repository = createSupabaseEmailOutboxRepository({ rpc: vi.fn(), from } as never);
    const row = {
      ...digitalRow,
      id: '20000000-0000-4000-8000-000000000001',
      createdAt: '2026-06-19T09:00:00.000Z'
    };

    await expect(
      repository.issueDownloadToken(row, {
        rawToken: 'krMVmeILCZGckZNphm9WMoTRMo3dHnoe4wNDZvpyICs',
        expiresAt: '2026-06-20T09:00:00.000Z',
        sourceEmailOutboxId: row.id
      })
    ).resolves.toEqual({ expiresAt: '2026-06-20T09:00:00.000Z' });

    expect(from).toHaveBeenCalledWith('digital_access_tokens');
    expect(eq).toHaveBeenCalledWith('source_email_outbox_id', row.id);
    expect(insert).not.toHaveBeenCalled();
  });

  test('stores only the token hash and outbox source on first issuance', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      insert
    }));
    const repository = createSupabaseEmailOutboxRepository({ rpc: vi.fn(), from } as never);
    const row = {
      ...digitalRow,
      id: '20000000-0000-4000-8000-000000000001',
      createdAt: '2026-06-19T09:00:00.000Z'
    };
    const preparation = {
      rawToken: 'krMVmeILCZGckZNphm9WMoTRMo3dHnoe4wNDZvpyICs',
      expiresAt: '2026-06-20T09:00:00.000Z',
      sourceEmailOutboxId: row.id
    };

    await expect(repository.issueDownloadToken(row, preparation)).resolves.toEqual({
      expiresAt: preparation.expiresAt
    });

    expect(insert).toHaveBeenCalledWith({
      entitlement_id: row.entitlementId,
      token_hash: 'fc93c8c89a9169c6946642b2190685cc057e96c2d7e38923208a2acdab821bcb',
      purpose: 'download',
      status: 'active',
      expires_at: preparation.expiresAt,
      source_email_outbox_id: row.id
    });
    expect(JSON.stringify(insert.mock.calls)).not.toContain(preparation.rawToken);
  });

  test('rejects a source-linked token whose persisted capability no longer matches', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: 'different-entitlement',
        token_hash: 'fc93c8c89a9169c6946642b2190685cc057e96c2d7e38923208a2acdab821bcb',
        purpose: 'download',
        status: 'active',
        expires_at: '2026-06-20T09:00:00.000Z'
      },
      error: null
    });
    const insert = vi.fn();
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      insert
    }));
    const repository = createSupabaseEmailOutboxRepository({ rpc: vi.fn(), from } as never);
    const row = {
      ...digitalRow,
      id: '20000000-0000-4000-8000-000000000001',
      createdAt: '2026-06-19T09:00:00.000Z'
    };

    await expect(
      repository.issueDownloadToken(row, {
        rawToken: 'krMVmeILCZGckZNphm9WMoTRMo3dHnoe4wNDZvpyICs',
        expiresAt: '2026-06-20T09:00:00.000Z',
        sourceEmailOutboxId: row.id
      })
    ).resolves.toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('transactional email worker route', () => {
  test('rejects missing or wrong worker secret', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('TRANSACTIONAL_EMAIL_WORKER_SECRET', 'correct-secret');

    const missing = await POST(
      new Request('https://shop.example.test/api/fulfillment/email-outbox', { method: 'POST' })
    );
    const wrong = await POST(
      new Request('https://shop.example.test/api/fulfillment/email-outbox', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-secret' }
      })
    );

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });
});

describe('admin transactional email recovery helpers', () => {
  test('masks recipients and sanitizes provider failure details', () => {
    expect(maskEmailForAdmin('buyer.long@example.test')).toBe('b***g@example.test');
    expect(
      sanitizeEmailFailureCode('Authorization: Bearer secret provider_payload raw_token')
    ).toBe('provider_error');
  });

  test('allows controlled retry only for failed or due pending rows', () => {
    expect(validateRetryCandidate({ status: 'failed', availableAt: null }, now)).toEqual({
      status: 'retryable'
    });
    expect(
      validateRetryCandidate(
        { status: 'pending', availableAt: new Date(now.getTime() - 1_000).toISOString() },
        now
      )
    ).toEqual({ status: 'retryable' });
    expect(validateRetryCandidate({ status: 'sent', availableAt: null }, now)).toEqual({
      status: 'stale',
      code: 'email_retry_not_available'
    });
  });

  test('builds download resend outbox and audit intent without reusing a stale link', () => {
    const intent = buildDownloadResendIntent({
      orderId: 'order-1',
      orderNumber: 'ATB-20260619-0001',
      entitlementId: 'entitlement-1',
      recipientEmail: 'buyer@example.test',
      locale: 'en',
      adminId: 'admin-1'
    });

    expect(intent.outbox).toMatchObject({
      event_type: 'digital_access_reissued',
      recipient_email: 'buyer@example.test',
      locale: 'en'
    });
    expect(intent.audit).toMatchObject({
      event_type: 'digital_access_resend_requested',
      actor_type: 'admin',
      actor_id: 'admin-1'
    });
    expect(JSON.stringify(intent)).not.toMatch(/raw_token|signed_url|pattern-pdfs|object_path/i);
  });

  test('records retry update failures instead of reporting queued success', async () => {
    vi.resetModules();
    const requireAdmin = vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.test' }));
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const maybeSingle = vi.fn(async () => ({
      data: { id: 'email-1', status: 'failed', available_at: null },
      error: null
    }));
    const updateEq = vi.fn(async () => ({
      data: null,
      error: { message: 'private retry update for buyer@example.test' }
    }));
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      update: vi.fn(() => ({ eq: updateEq }))
    }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => ({ from }))
    }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure }));
    const { retryTransactionalEmailAction } = await import('@/fulfillment/admin-email-actions');
    const formData = new FormData();
    formData.set('emailId', 'email-1');

    await expect(retryTransactionalEmailAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'email_action_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'error',
        errorCode: 'admin_email_retry_failed',
        summary: 'Admin transactional email retry failed',
        facts: expect.objectContaining({
          action: 'email_retry',
          referenceId: 'email-1',
          code: 'email_action_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /buyer@example|admin@example|private retry|token|signed/i
    );
  });

  test('keeps retry failure result stable when operational recording fails', async () => {
    vi.resetModules();
    const requireAdmin = vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.test' }));
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const maybeSingle = vi.fn(async () => ({
      data: { id: 'email-1', status: 'failed', available_at: null },
      error: null
    }));
    const updateEq = vi.fn(async () => ({
      data: null,
      error: { message: 'private retry update for buyer@example.test' }
    }));
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      update: vi.fn(() => ({ eq: updateEq }))
    }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => ({ from }))
    }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure }));
    const { retryTransactionalEmailAction } = await import('@/fulfillment/admin-email-actions');
    const formData = new FormData();
    formData.set('emailId', 'email-1');

    await expect(retryTransactionalEmailAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'email_action_failed'
    });
  });

  test('records download resend insert failures without exposing recipient email or payload', async () => {
    vi.resetModules();
    const requireAdmin = vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.test' }));
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const outboxInsert = vi.fn(async () => ({
      data: null,
      error: { message: 'private outbox insert for buyer@example.test' }
    }));
    const auditInsert = vi.fn(async () => ({ data: null, error: null }));
    const from = vi.fn((table: string) => {
      if (table === 'transactional_email_outbox') {
        return { insert: outboxInsert };
      }
      return { insert: auditInsert };
    });
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => ({ from }))
    }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure }));
    const { resendDownloadEmailAction } = await import('@/fulfillment/admin-email-actions');
    const formData = new FormData();
    formData.set('orderId', 'order-1');
    formData.set('orderNumber', 'ATB-20260708-0001');
    formData.set('entitlementId', 'entitlement-1');
    formData.set('recipientEmail', 'buyer@example.test');
    formData.set('locale', 'en');

    await expect(resendDownloadEmailAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'email_action_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'error',
        errorCode: 'admin_download_resend_failed',
        summary: 'Admin download email resend failed',
        facts: expect.objectContaining({
          action: 'download_email_resend',
          emailType: 'digital_access_reissued',
          orderId: 'order-1',
          orderNumber: 'ATB-20260708-0001',
          entitlementId: 'entitlement-1',
          code: 'email_action_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /buyer@example|admin@example|private outbox|recipient_email|expiresInHours|raw_token|signed_url|token/i
    );
  });

  test('keeps download resend failure result stable when operational recording fails', async () => {
    vi.resetModules();
    const requireAdmin = vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.test' }));
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const outboxInsert = vi.fn(async () => ({
      data: null,
      error: { message: 'private outbox insert for buyer@example.test' }
    }));
    const auditInsert = vi.fn(async () => ({ data: null, error: null }));
    const from = vi.fn((table: string) => {
      if (table === 'transactional_email_outbox') {
        return { insert: outboxInsert };
      }
      return { insert: auditInsert };
    });
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => ({ from }))
    }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure }));
    const { resendDownloadEmailAction } = await import('@/fulfillment/admin-email-actions');
    const formData = new FormData();
    formData.set('orderId', 'order-1');
    formData.set('orderNumber', 'ATB-20260708-0001');
    formData.set('entitlementId', 'entitlement-1');
    formData.set('recipientEmail', 'buyer@example.test');
    formData.set('locale', 'en');

    await expect(resendDownloadEmailAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'email_action_failed'
    });
  });
});
