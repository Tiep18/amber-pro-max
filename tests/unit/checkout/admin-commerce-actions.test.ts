import { beforeEach, describe, expect, test, vi } from 'vitest';

const { requireAdmin, createSupabaseServerClient, revalidatePath, recordOperationalFailure } =
  vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    revalidatePath: vi.fn(),
    recordOperationalFailure: vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }))
  }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/auth/guards', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));
vi.mock('@/operations/errors', () => ({ recordOperationalFailure }));

import {
  createDiscountCodeAction,
  disableDiscountCodeAction
} from '@/checkout/admin-discount-actions';
import {
  createShippingProfileAction,
  deactivateShippingProfileAction,
  saveShippingRegionAdjustmentAction,
  saveShippingRuleAction,
  setShippingProfileActiveAction,
  setStoreDefaultShippingProfileAction
} from '@/checkout/admin-shipping-actions';

const discountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';

function discountForm() {
  const formData = new FormData();
  formData.set('code', 'SUMMER10');
  formData.set('description', 'Private campaign details');
  formData.set('discountType', 'percentage');
  formData.set('percentage', '10');
  formData.set('market', 'vn');
  formData.set('minimumSubtotal', '100000');
  formData.set('usageLimit', '5');
  return formData;
}

function shippingForm() {
  const formData = new FormData();
  formData.set('name', 'Vietnam domestic');
  formData.set('description', 'Internal carrier notes');
  formData.set('countryCode', 'VN');
  formData.set('currencyCode', 'VND');
  formData.set('firstItemFee', '30000');
  formData.set('additionalItemFee', '10000');
  return formData;
}

beforeEach(() => {
  requireAdmin.mockReset();
  createSupabaseServerClient.mockReset();
  revalidatePath.mockReset();
  recordOperationalFailure.mockClear();
  requireAdmin.mockResolvedValue({ id: 'admin-user' });
});

describe('admin commerce operational recording', () => {
  test('rejects malformed fallback rules and unsupported US region codes before opening a database client', async () => {
    await expect(
      saveShippingRuleAction({
        profileId,
        destinationKind: 'fallback',
        countryCode: 'US',
        currencyCode: 'USD',
        firstItemFeeMinor: 500,
        additionalItemFeeMinor: 100,
        active: true
      })
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_shipping_rule' });
    await expect(
      saveShippingRegionAdjustmentAction({
        shippingRuleId: profileId,
        countryCode: 'US',
        regionCode: 'California',
        mode: 'surcharge',
        firstItemFeeMinor: 100,
        additionalItemFeeMinor: 0,
        active: true
      })
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_shipping_region' });

    expect(requireAdmin).toHaveBeenCalledTimes(2);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  test('sets a store default through the single atomic RPC after authorization', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    createSupabaseServerClient.mockResolvedValue({ rpc });

    await expect(setStoreDefaultShippingProfileAction(profileId)).resolves.toEqual({
      status: 'updated'
    });

    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_set_shipping_store_default', {
      p_profile_id: profileId
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/shipping');
  });

  test('records discount create persistence failures without exposing raw discount details', async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: null, error: { message: 'duplicate internal code' } }))
      }))
    }));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ insert }))
    });

    await expect(createDiscountCodeAction(discountForm())).resolves.toMatchObject({
      status: 'error',
      code: 'create_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'discount_create_failed',
        summary: 'Admin discount code creation failed',
        facts: expect.objectContaining({
          action: 'discount_create',
          code: 'create_failed',
          market: 'vn'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /SUMMER10|Private campaign|duplicate internal code/i
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('records discount disable failures with only the discount reference id', async () => {
    const eq = vi.fn(async () => ({ error: { message: 'rls failed' } }));
    const update = vi.fn(() => ({ eq }));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ update }))
    });

    await expect(disableDiscountCodeAction(discountId)).resolves.toMatchObject({
      status: 'error',
      code: 'disable_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'discount_disable_failed',
        summary: 'Admin discount code disable failed',
        facts: expect.objectContaining({
          action: 'discount_disable',
          code: 'disable_failed',
          referenceId: discountId
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/rls failed/i);
  });

  test('records shipping rule creation failures without exposing fee text or notes', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'shipping_profiles') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: profileId }, error: null }))
            }))
          }))
        };
      }
      return {
        insert: vi.fn(async () => ({ data: null, error: { message: 'constraint detail' } }))
      };
    });
    createSupabaseServerClient.mockResolvedValue({ from });

    await expect(createShippingProfileAction(shippingForm())).resolves.toMatchObject({
      status: 'error',
      code: 'create_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'shipping_create_failed',
        summary: 'Admin shipping creation failed',
        facts: expect.objectContaining({
          action: 'shipping_create',
          code: 'create_failed',
          phase: 'shipping_rule_create',
          referenceId: profileId,
          currency: 'VND'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /30000|10000|Internal carrier|constraint detail/i
    );
  });

  test('records shipping profile deactivate failures with profile reference only', async () => {
    const eq = vi.fn(async () => ({ error: { message: 'db timeout' } }));
    const update = vi.fn(() => ({ eq }));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) =>
        table === 'shipping_store_defaults'
          ? {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null, error: null }))
                  }))
                }))
              }))
            }
          : { update }
      )
    });

    await expect(deactivateShippingProfileAction(profileId)).resolves.toMatchObject({
      status: 'error',
      code: 'deactivate_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'shipping_deactivate_failed',
        summary: 'Admin shipping deactivation failed',
        facts: expect.objectContaining({
          action: 'shipping_deactivate',
          code: 'deactivate_failed',
          phase: 'shipping_profile_deactivate',
          referenceId: profileId
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/db timeout/i);
  });

  test('blocks deactivating the current default and can reactivate a package with its rates', async () => {
    const maybeSingle = vi.fn(async () => ({ data: { id: 'default-row' }, error: null }));
    const eqAfterSelect = vi.fn(() => ({ maybeSingle }));
    const eqSelect = vi.fn(() => ({ eq: eqAfterSelect }));
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn((table: string) =>
      table === 'shipping_store_defaults' ? { select: vi.fn(() => ({ eq: eqSelect })) } : { update }
    );
    createSupabaseServerClient.mockResolvedValue({ from });

    await expect(deactivateShippingProfileAction(profileId)).resolves.toEqual({
      status: 'invalid',
      code: 'default_shipping_profile'
    });
    expect(update).not.toHaveBeenCalled();

    await expect(setShippingProfileActiveAction(profileId, true)).resolves.toEqual({
      status: 'activated'
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/shipping');
  });

  test('keeps admin commerce error states when operational recording fails', async () => {
    recordOperationalFailure.mockRejectedValue(new Error('operational table unavailable'));

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: { message: 'discount failed' } }))
          }))
        }))
      }))
    });
    await expect(createDiscountCodeAction(discountForm())).resolves.toEqual({
      status: 'error',
      code: 'create_failed'
    });

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: { message: 'disable failed' } }))
        }))
      }))
    });
    await expect(disableDiscountCodeAction(discountId)).resolves.toEqual({
      status: 'error',
      code: 'disable_failed'
    });

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: { message: 'profile failed' } }))
          }))
        }))
      }))
    });
    await expect(createShippingProfileAction(shippingForm())).resolves.toEqual({
      status: 'error',
      code: 'create_failed'
    });

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn((table: string) =>
        table === 'shipping_store_defaults'
          ? {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null, error: null }))
                  }))
                }))
              }))
            }
          : {
              update: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: { message: 'deactivate failed' } }))
              }))
            }
      )
    });
    await expect(deactivateShippingProfileAction(profileId)).resolves.toEqual({
      status: 'error',
      code: 'deactivate_failed'
    });
  });
});
