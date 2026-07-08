import {beforeEach, describe, expect, test, vi} from 'vitest';

const {createSupabaseServerClientMock, recordOperationalFailureMock, requireAdminMock, revalidatePathMock} = vi.hoisted(
  () => ({
    createSupabaseServerClientMock: vi.fn(),
    recordOperationalFailureMock: vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    })),
    requireAdminMock: vi.fn(),
    revalidatePathMock: vi.fn()
  })
);

vi.mock('@/auth/guards', () => ({requireAdmin: requireAdminMock}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: createSupabaseServerClientMock}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));
vi.mock('next/cache', () => ({revalidatePath: revalidatePathMock}));

import {
  approveExceptionRequest,
  createExceptionRequest,
  hashExceptionToken,
  maskEmail,
  rejectExceptionRequest,
  validateExceptionGrant
} from '@/checkout/exceptions';

const productId = '11111111-1111-4111-8111-111111111111';
const variantId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';

function exceptionRequestInput() {
  return {
    contactEmail: 'customer@example.test',
    customerNote: 'Private customer note must not be logged',
    productId,
    variantId,
    market: 'intl',
    destinationCountryCode: 'US',
    locale: 'en'
  };
}

describe('exception helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-id', email: 'admin@example.test'});
  });

  test('hashes grant tokens without returning the raw token', () => {
    const hash = hashExceptionToken('raw-token');

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('raw-token');
  });

  test('masks customer email for admin lists', () => {
    expect(maskEmail('customer@example.com')).toBe('c***@example.com');
  });

  test('validates grants through the scoped RPC helper', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {status: 'valid', grantId: 'grant-1', expiresAt: '2026-06-17T00:00:00.000Z'},
      error: null
    });

    await expect(validateExceptionGrant({token: 'raw-token'}, {rpc} as never)).resolves.toEqual({
      status: 'valid',
      grantId: 'grant-1',
      expiresAt: '2026-06-17T00:00:00.000Z'
    });
    expect(rpc).toHaveBeenCalledWith('validate_market_exception_grant', {
      p_token_hash: hashExceptionToken('raw-token')
    });
  });

  test('records create request RPC failures without exposing contact details or notes', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'private request rpc failed for customer@example.test'}
    });

    await expect(createExceptionRequest(exceptionRequestInput(), {rpc})).resolves.toEqual({
      status: 'error',
      code: 'exception_request_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        severity: 'error',
        errorCode: 'checkout_exception_request_failed',
        summary: 'Checkout exception request failed',
        facts: expect.objectContaining({
          action: 'exception_request_create',
          productId,
          referenceId: variantId,
          market: 'intl',
          code: 'exception_request_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /customer@example|Private customer note|private request|token/i
    );
  });

  test('records approval grant insert failures without exposing admin notes or tokens', async () => {
    const requestQuery = {
      select: vi.fn(() => requestQuery),
      eq: vi.fn(() => requestQuery),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: requestId,
          product_id: productId,
          variant_id: variantId,
          market: 'intl',
          destination_country_code: 'US',
          status: 'pending'
        },
        error: null
      }))
    };
    const grantSingle = vi.fn(async () => ({
      data: null,
      error: {message: 'private grant insert failed with token hash'}
    }));
    const grantSelect = vi.fn(() => ({single: grantSingle}));
    const grantInsert = vi.fn(() => ({select: grantSelect}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => (table === 'market_exception_requests' ? requestQuery : {insert: grantInsert}))
    });

    await expect(
      approveExceptionRequest({
        requestId,
        shippingFeeMinor: 1200,
        currencyCode: 'USD',
        adminNote: 'Private approval note must not be logged'
      })
    ).resolves.toEqual({
      status: 'error',
      code: 'exception_approval_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        severity: 'error',
        errorCode: 'checkout_exception_approval_failed',
        summary: 'Checkout exception approval failed',
        facts: expect.objectContaining({
          action: 'exception_request_approve',
          productId,
          referenceId: requestId,
          market: 'intl',
          currency: 'USD',
          amountValue: 1200,
          code: 'exception_approval_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /Private approval note|private grant|token|hash|admin@example/i
    );
  });

  test('records rejection update failures without exposing rejection reasons', async () => {
    const eqStatus = vi.fn(async () => ({error: {message: 'private rejection update detail'}}));
    const eqRequest = vi.fn(() => ({eq: eqStatus}));
    const update = vi.fn(() => ({eq: eqRequest}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(
      rejectExceptionRequest({
        requestId,
        reason: 'Private rejection reason must not be logged'
      })
    ).resolves.toEqual({
      status: 'error',
      code: 'exception_rejection_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        severity: 'error',
        errorCode: 'checkout_exception_rejection_failed',
        summary: 'Checkout exception rejection failed',
        facts: expect.objectContaining({
          action: 'exception_request_reject',
          referenceId: requestId,
          code: 'exception_rejection_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /Private rejection|private rejection update|admin@example|token/i
    );
  });

  test('records grant validation RPC failures without exposing raw tokens or token hashes', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'private grant validate failed for raw-token'}
    });

    await expect(validateExceptionGrant({token: 'raw-token'}, {rpc} as never)).resolves.toEqual({
      status: 'error',
      code: 'exception_grant_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        severity: 'error',
        errorCode: 'checkout_exception_grant_failed',
        summary: 'Checkout exception grant validation failed',
        facts: expect.objectContaining({
          action: 'exception_grant_validate',
          code: 'exception_grant_failed'
        })
      })
    );
    const calls = JSON.stringify(recordOperationalFailureMock.mock.calls);
    expect(calls).not.toMatch(/raw-token|private grant|token_hash|p_token_hash/i);
    expect(calls).not.toContain(hashExceptionToken('raw-token'));
  });
});
