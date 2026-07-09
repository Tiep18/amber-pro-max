import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  createSupabaseAdminClientMock,
  createSupabaseServerClientMock,
  requireAdminMock,
  recordOperationalFailureMock
} = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  requireAdminMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}))
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireAdmin: requireAdminMock}));
vi.mock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: createSupabaseAdminClientMock}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: createSupabaseServerClientMock}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {getAdminDashboard} from '@/admin/dashboard-queries';
import {getAdminLaunchReadiness} from '@/launch/settings';

function countBuilder(result: {count: number | null; error: unknown}) {
  const builder = {
    count: result.count,
    error: result.error,
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gt: vi.fn(() => builder)
  };
  return builder;
}

describe('admin system loader operational recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-user'});
  });

  it('records admin dashboard load failures without exposing raw count details', async () => {
    const paymentsCount = countBuilder({
      count: null,
      error: {message: 'relation private.dashboard_secret does not exist'}
    });
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => paymentsCount)
      }))
    });
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({maybeSingle: vi.fn(async () => ({data: null, error: null}))}))
        }))
      }))
    });

    await expect(getAdminDashboard({requireAdmin: requireAdminMock})).resolves.toMatchObject({
      status: 'error',
      code: 'admin_dashboard_load_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_dashboard_load_failed',
        summary: 'Admin dashboard load failed',
        facts: expect.objectContaining({
          action: 'admin_dashboard_load',
          code: 'admin_dashboard_load_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/dashboard_secret|relation|private|email|token/i);
  });

  it('keeps admin dashboard error result stable when operational recording fails', async () => {
    recordOperationalFailureMock.mockRejectedValueOnce(new Error('operational table unavailable'));
    const paymentsCount = countBuilder({
      count: null,
      error: {message: 'relation private.dashboard_secret does not exist'}
    });
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => paymentsCount)
      }))
    });
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({maybeSingle: vi.fn(async () => ({data: null, error: null}))}))
        }))
      }))
    });

    await expect(getAdminDashboard({requireAdmin: requireAdminMock})).resolves.toEqual({
      status: 'error',
      code: 'admin_dashboard_load_failed'
    });
  });

  it('records launch readiness load failures without exposing launch evidence values', async () => {
    const settingsMaybeSingle = vi.fn(async () => ({
      data: null,
      error: {message: 'raw evidence paypal=secret-signature buyer@example.com'}
    }));
    const from = vi.fn((table: string) => {
      if (table === 'launch_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({maybeSingle: settingsMaybeSingle}))
          }))
        };
      }
      return {
        select: vi.fn(async () => ({
          data: [],
          error: null
        }))
      };
    });
    createSupabaseServerClientMock.mockResolvedValue({from});

    await expect(getAdminLaunchReadiness({requireAdmin: requireAdminMock})).resolves.toMatchObject({
      status: 'error',
      code: 'admin_launch_load_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_launch_load_failed',
        summary: 'Admin launch readiness load failed',
        facts: expect.objectContaining({
          action: 'admin_launch_readiness_load',
          code: 'admin_launch_load_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/secret-signature|buyer@example|raw evidence|paypal=/i);
  });

  it('keeps launch readiness error result stable when operational recording fails', async () => {
    recordOperationalFailureMock.mockRejectedValueOnce(new Error('operational table unavailable'));
    const settingsMaybeSingle = vi.fn(async () => ({
      data: null,
      error: {message: 'raw evidence paypal=secret-signature buyer@example.com'}
    }));
    const from = vi.fn((table: string) => {
      if (table === 'launch_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({maybeSingle: settingsMaybeSingle}))
          }))
        };
      }
      return {
        select: vi.fn(async () => ({
          data: [],
          error: null
        }))
      };
    });
    createSupabaseServerClientMock.mockResolvedValue({from});

    await expect(getAdminLaunchReadiness({requireAdmin: requireAdminMock})).resolves.toEqual({
      status: 'error',
      code: 'admin_launch_load_failed'
    });
  });
});
