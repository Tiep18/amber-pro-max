import {beforeEach, describe, expect, it, vi} from 'vitest';

const {createSupabaseServerClientMock, requireAdminMock} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireAdminMock: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));
vi.mock('@/auth/guards', () => ({
  requireAdmin: requireAdminMock
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn()
}));

import {markOperationalErrorResolved} from '@/operations/errors';
import {sanitizeOperationalErrorFacts, sanitizeOperationalErrorInput, sanitizeOperationalErrorSummary} from '@/operations/redaction';

describe('OPS-03 D-11 operational error redaction', () => {
  it('keeps safe operational facts and drops raw provider payloads, tokens, signatures, emails, addresses, and stacks', () => {
    const facts = sanitizeOperationalErrorFacts({
      provider: 'paypal',
      providerOrderId: 'ORDER-123',
      status: 'DECLINED',
      amountCurrency: 'USD',
      accessToken: 'secret-token',
      paypalSignature: 'signed',
      rawPayload: {payer: {email: 'buyer@example.com'}},
      customerEmail: 'buyer@example.com',
      shippingAddress: '123 Long Street',
      stackTrace: 'Error: boom',
      signedUrl: 'https://example.com/download?token=abc'
    });

    expect(facts).toEqual({
      provider: 'paypal',
      providerOrderId: 'ORDER-123',
      status: 'DECLINED',
      amountCurrency: 'USD'
    });
    expect(JSON.stringify(facts)).not.toMatch(/buyer@example\.com|secret-token|signature|rawPayload|Long Street|stack|token/i);
  });

  it('redacts unsafe summaries before storage or display', () => {
    expect(sanitizeOperationalErrorSummary('Bearer abc.def secret for buyer@example.com')).toBe(
      'Operational error details redacted'
    );
    expect(sanitizeOperationalErrorSummary('PayPal capture failed after provider verification')).toBe(
      'PayPal capture failed after provider verification'
    );
  });

  it('normalizes unsafe input into a stable safe shape', () => {
    expect(
      sanitizeOperationalErrorInput({
        area: 'unknown',
        severity: 'panic',
        errorCode: 'Provider Error!',
        summary: 'raw payload contained token',
        facts: {orderNumber: 'AM-1001', authorization: 'Bearer token'}
      })
    ).toEqual({
      area: 'application',
      severity: 'error',
      errorCode: 'provider_error_',
      summary: 'Operational error details redacted',
      facts: {orderNumber: 'AM-1001'}
    });
  });

  it('keeps storefront as a first-class operational area', () => {
    expect(
      sanitizeOperationalErrorInput({
        area: 'storefront',
        severity: 'warning',
        errorCode: 'storefront.catalog.query_failed',
        summary: 'Storefront catalog query failed',
        facts: {locale: 'en', market: 'intl'}
      })
    ).toEqual({
      area: 'storefront',
      severity: 'warning',
      errorCode: 'storefront.catalog.query_failed',
      summary: 'Storefront catalog query failed',
      facts: {locale: 'en', market: 'intl'}
    });
  });

  it('keeps safe database diagnostics while dropping unsafe diagnostic values', () => {
    expect(
      sanitizeOperationalErrorFacts({
        source: 'supabase.postgrest',
        dbCode: '42501',
        dbMessage: 'permission denied for table checkout_orders',
        dbHint: 'Grant the required privileges to the current role',
        dbDetails: 'function public.get_order_payment_status(text,text)',
        authState: 'required_user_present',
        authRole: 'authenticated',
        userPresent: true,
        unsafeMessage: 'buyer@example.test',
        dbUnsafeEmail: 'buyer@example.test',
        dbUnsafeBearer: 'Bearer abc.def'
      })
    ).toEqual({
      source: 'supabase.postgrest',
      dbCode: '42501',
      dbMessage: 'permission denied for table checkout_orders',
      dbHint: 'Grant the required privileges to the current role',
      dbDetails: 'function public.get_order_payment_status(text,text)',
      authState: 'required_user_present',
      authRole: 'authenticated',
      userPresent: true
    });
  });
});

describe('OPS-03 D-12 operational error admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: '11111111-1111-4111-8111-111111111111'});
  });

  it('requires admin authorization before resolving an operational error', async () => {
    requireAdminMock.mockRejectedValue(new Error('forbidden'));

    await expect(markOperationalErrorResolved('76000000-0000-4000-8000-000000000001')).rejects.toThrow('forbidden');

    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
