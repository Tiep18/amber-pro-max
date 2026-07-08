import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {POST} from '@/app/api/fulfillment/email-outbox/route';
import {
  buildDownloadResendIntent,
  maskEmailForAdmin,
  sanitizeEmailFailureCode,
  validateRetryCandidate
} from '@/fulfillment/admin-email-actions';
import {processTransactionalEmailBatch} from '@/fulfillment/email-outbox';
import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
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

  test('records operational failures for retry, permanent failure, and worker exceptions without recipient PII', async () => {
    const repository = {
      claimDueRows: vi.fn().mockResolvedValue([
        {...digitalRow, id: 'email-retry', orderId: 'order-retry'},
        {...digitalRow, id: 'email-failed', orderId: 'order-failed'},
        {...digitalRow, id: 'email-exception', recipientEmail: 'boom@example.test', orderId: 'order-exception'}
      ]),
      issueDownloadToken: vi
        .fn()
        .mockResolvedValueOnce({rawToken: 'retry-token', expiresAt: new Date(now.getTime() + 86_400_000).toISOString()})
        .mockResolvedValueOnce({rawToken: 'failed-token', expiresAt: new Date(now.getTime() + 86_400_000).toISOString()})
        .mockRejectedValueOnce(new Error('token issue failed for boom@example.test')),
      issueGuestToken: vi.fn(),
      markSent: vi.fn().mockResolvedValue(undefined),
      markRetry: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const sender = {
      send: vi
        .fn()
        .mockResolvedValueOnce({status: 'retry', code: 'rate_limited'})
        .mockResolvedValueOnce({status: 'failed', code: 'invalid_recipient'})
    };
    const operationalFailureRecorder = vi.fn().mockResolvedValue({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'});

    const result = await processTransactionalEmailBatch({
      repository,
      sender,
      operationalFailureRecorder,
      now: () => now,
      config: {siteUrl: 'https://shop.example.test', fromEmail: 'orders@example.test', batchSize: 5}
    });

    expect(result).toEqual({status: 'processed', claimed: 3, sent: 0, retry: 1, failed: 2});
    expect(operationalFailureRecorder).toHaveBeenCalledTimes(3);
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'warning',
        errorCode: 'rate_limited',
        summary: 'Transactional email send scheduled for retry',
        facts: expect.objectContaining({emailType: 'digital_access_granted', orderId: 'order-retry'})
      })
    );
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'error',
        errorCode: 'invalid_recipient',
        summary: 'Transactional email send failed',
        facts: expect.objectContaining({emailType: 'digital_access_granted', orderId: 'order-failed'})
      })
    );
    expect(operationalFailureRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'email',
        severity: 'error',
        errorCode: 'email_worker_error',
        summary: 'Transactional email worker failed',
        facts: expect.objectContaining({emailType: 'digital_access_granted', orderId: 'order-exception'})
      })
    );
    expect(JSON.stringify(operationalFailureRecorder.mock.calls)).not.toMatch(/buyer@example\.test|boom@example\.test|retry-token|failed-token/i);
  });

  test('immediate paid trigger is a safe no-op when transactional email is unconfigured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('RESEND_API_KEY', undefined);
    vi.stubEnv('RESEND_FROM_EMAIL', undefined);

    await expect(triggerTransactionalEmailOutboxNow({reason: 'paypal_webhook_paid'})).resolves.toEqual({
      status: 'unconfigured',
      code: 'missing_transactional_email_config'
    });
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

describe('admin transactional email recovery helpers', () => {
  test('masks recipients and sanitizes provider failure details', () => {
    expect(maskEmailForAdmin('buyer.long@example.test')).toBe('b***g@example.test');
    expect(sanitizeEmailFailureCode('Authorization: Bearer secret provider_payload raw_token')).toBe('provider_error');
  });

  test('allows controlled retry only for failed or due pending rows', () => {
    expect(validateRetryCandidate({status: 'failed', availableAt: null}, now)).toEqual({status: 'retryable'});
    expect(validateRetryCandidate({status: 'pending', availableAt: new Date(now.getTime() - 1_000).toISOString()}, now)).toEqual({status: 'retryable'});
    expect(validateRetryCandidate({status: 'sent', availableAt: null}, now)).toEqual({status: 'stale', code: 'email_retry_not_available'});
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
    const requireAdmin = vi.fn(async () => ({id: 'admin-1', email: 'admin@example.test'}));
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const maybeSingle = vi.fn(async () => ({
      data: {id: 'email-1', status: 'failed', available_at: null},
      error: null
    }));
    const updateEq = vi.fn(async () => ({data: null, error: {message: 'private retry update for buyer@example.test'}}));
    const from = vi.fn(() => ({
      select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle}))})),
      update: vi.fn(() => ({eq: updateEq}))
    }));
    vi.doMock('next/cache', () => ({revalidatePath: vi.fn()}));
    vi.doMock('@/auth/guards', () => ({requireAdmin}));
    vi.doMock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: vi.fn(() => ({from}))}));
    vi.doMock('@/operations/errors', () => ({recordOperationalFailure}));
    const {retryTransactionalEmailAction} = await import('@/fulfillment/admin-email-actions');
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
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/buyer@example|admin@example|private retry|token|signed/i);
  });

  test('records download resend insert failures without exposing recipient email or payload', async () => {
    vi.resetModules();
    const requireAdmin = vi.fn(async () => ({id: 'admin-1', email: 'admin@example.test'}));
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const outboxInsert = vi.fn(async () => ({data: null, error: {message: 'private outbox insert for buyer@example.test'}}));
    const auditInsert = vi.fn(async () => ({data: null, error: null}));
    const from = vi.fn((table: string) => {
      if (table === 'transactional_email_outbox') {
        return {insert: outboxInsert};
      }
      return {insert: auditInsert};
    });
    vi.doMock('next/cache', () => ({revalidatePath: vi.fn()}));
    vi.doMock('@/auth/guards', () => ({requireAdmin}));
    vi.doMock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: vi.fn(() => ({from}))}));
    vi.doMock('@/operations/errors', () => ({recordOperationalFailure}));
    const {resendDownloadEmailAction} = await import('@/fulfillment/admin-email-actions');
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
});
