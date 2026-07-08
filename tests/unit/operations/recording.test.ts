import {beforeEach, describe, expect, it, vi} from 'vitest';

const {createSupabaseAdminClientMock} = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock
}));

import {recordOperationalFailure} from '@/operations/errors';

describe('recordOperationalFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the stored operational error id for user-safe reference flows', async () => {
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({data: {id: '76000000-0000-4000-8000-000000000001'}, error: null}))
          }))
        }))
      }))
    });

    await expect(
      recordOperationalFailure({
        area: 'checkout',
        severity: 'error',
        errorCode: 'checkout_quote_failed',
        summary: 'Checkout quote failed',
        facts: {
          market: 'intl',
          orderNumber: 'ATB-1001',
          customerEmail: 'buyer@example.test',
          stackTrace: 'Error: hidden'
        }
      })
    ).resolves.toEqual({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'});
  });

  it('does not throw or leak unsafe facts when operational error storage fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createSupabaseAdminClientMock.mockImplementation(() => {
      throw new Error('database unavailable with buyer@example.test');
    });

    await expect(
      recordOperationalFailure({
        area: 'checkout',
        errorCode: 'checkout_submit_failed',
        summary: 'Bearer token leaked in original failure',
        facts: {
          paymentId: 'pay-1',
          rawPayload: {email: 'buyer@example.test'},
          signedUrl: 'https://example.test/download?token=secret'
        }
      })
    ).resolves.toEqual({status: 'error', code: 'operational_error_record_failed'});

    expect(consoleError).toHaveBeenCalledWith(
      '[operational-error] record_failed',
      expect.not.stringMatching(/buyer@example\.test|Bearer|token=secret|rawPayload/i)
    );
    consoleError.mockRestore();
  });

  it('logs a sanitized fallback when operational error insertion returns an error result', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({data: null, error: {message: 'buyer@example.test token failed'}}))
          }))
        }))
      }))
    });

    await expect(
      recordOperationalFailure({
        area: 'checkout',
        errorCode: 'checkout_submit_failed',
        summary: 'Checkout submit failed',
        facts: {
          paymentId: 'pay-1',
          customerEmail: 'buyer@example.test'
        }
      })
    ).resolves.toEqual({status: 'error', code: 'operational_error_record_failed'});

    expect(consoleError).toHaveBeenCalledWith(
      '[operational-error] record_failed',
      expect.not.stringMatching(/buyer@example\.test|token/i)
    );
    consoleError.mockRestore();
  });
});
