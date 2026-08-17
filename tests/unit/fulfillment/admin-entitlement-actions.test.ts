import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('admin entitlement server actions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('authorizes before creating the cookie-backed RPC client for reissue', async () => {
    const calls: string[] = [];
    const requireAdmin = vi.fn(async () => {
      calls.push('requireAdmin');
      return { id: 'admin-1' };
    });
    const rpc = vi.fn(async () => ({ data: { status: 'reissued', version: 4 }, error: null }));
    const createSupabaseServerClient = vi.fn(async () => {
      calls.push('createSupabaseServerClient');
      return { rpc };
    });
    const createSupabaseAdminClient = vi.fn(() => ({ rpc }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin }));
    vi.doMock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));
    vi.doMock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure: vi.fn() }));
    const { reissueDigitalEntitlementAction } = await import(
      '@/fulfillment/admin-entitlement-actions'
    );
    const formData = new FormData();
    formData.set('entitlementId', '22222222-2222-4222-8222-222222222222');
    formData.set('expectedVersion', '3');
    formData.set('orderId', 'order-1');
    formData.set('orderNumber', 'ATB-20260817-0001');

    await expect(reissueDigitalEntitlementAction(formData)).resolves.toEqual({
      status: 'reissued',
      version: 4
    });

    expect(calls).toEqual(['requireAdmin', 'createSupabaseServerClient']);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('reissue_digital_access_token', {
      p_entitlement_id: '22222222-2222-4222-8222-222222222222',
      p_expected_version: 3
    });
  });

  test('records only safe identifiers when authenticated reissue fails', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/auth/guards', () => ({ requireAdmin: vi.fn(async () => ({ id: 'admin-1' })) }));
    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn(async () => ({
        rpc: vi.fn(async () => ({
          data: null,
          error: { message: 'private failure buyer@example.test raw-token' }
        }))
      }))
    }));
    vi.doMock('@/operations/errors', () => ({ recordOperationalFailure }));
    const { reissueDigitalEntitlementAction } = await import(
      '@/fulfillment/admin-entitlement-actions'
    );
    const formData = new FormData();
    formData.set('entitlementId', '22222222-2222-4222-8222-222222222222');
    formData.set('expectedVersion', '3');
    formData.set('orderId', 'order-1');
    formData.set('orderNumber', 'ATB-20260817-0001');

    await expect(reissueDigitalEntitlementAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'entitlement_action_failed'
    });
    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'entitlement_action_failed',
        facts: expect.objectContaining({
          entitlementId: '22222222-2222-4222-8222-222222222222'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /buyer@example|raw-token|private failure/i
    );
  });
});
