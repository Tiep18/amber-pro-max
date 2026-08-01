import {beforeEach, describe, expect, test, vi} from 'vitest';

const {createSupabaseServerClientMock, getGuestOrderAccessHashMock, recordOperationalFailureMock} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getGuestOrderAccessHashMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('next/headers', () => ({cookies: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: createSupabaseServerClientMock}));
vi.mock('@/payments/guest-access', () => ({getGuestOrderAccessHashFromServer: getGuestOrderAccessHashMock}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {declareVietQrTransferAction} from '@/payments/vietqr/customer-actions';

describe('declareVietQrTransferAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGuestOrderAccessHashMock.mockResolvedValue('guest-hash');
  });

  test('resolves the guest secret hash and forwards it to the RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({data: {status: 'recorded'}, error: null});
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(declareVietQrTransferAction('atb-1')).resolves.toEqual({status: 'recorded'});

    expect(rpc).toHaveBeenCalledWith('declare_vietqr_transfer', {
      p_order_number: 'atb-1',
      p_guest_secret_hash: 'guest-hash'
    });
  });

  test('passes through not_eligible and forbidden without recording an operational failure', async () => {
    const rpc = vi.fn().mockResolvedValue({data: {status: 'not_eligible'}, error: null});
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(declareVietQrTransferAction('atb-1')).resolves.toEqual({status: 'not_eligible'});
    expect(recordOperationalFailureMock).not.toHaveBeenCalled();
  });

  test('maps an RPC error to a generic error result and records it without leaking the order number', async () => {
    const rpc = vi.fn().mockResolvedValue({data: null, error: {message: 'db unavailable'}});
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(declareVietQrTransferAction('ATB-SECRET-1')).resolves.toEqual({
      status: 'error',
      code: 'vietqr_declare_failed',
      errorId: '76000000-0000-4000-8000-000000000001'
    });
  });

  test('rejects an empty order number without calling the database', async () => {
    await expect(declareVietQrTransferAction('  ')).resolves.toEqual({status: 'forbidden'});
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
