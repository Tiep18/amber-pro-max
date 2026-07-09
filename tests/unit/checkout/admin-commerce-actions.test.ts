import {beforeEach, describe, expect, test, vi} from 'vitest';

const {requireAdmin, createSupabaseServerClient, revalidatePath, recordOperationalFailure} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  recordOperationalFailure: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath}));
vi.mock('@/auth/guards', () => ({requireAdmin}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure}));

import {createDiscountCodeAction, disableDiscountCodeAction} from '@/checkout/admin-discount-actions';
import {createShippingProfileAction, deactivateShippingProfileAction} from '@/checkout/admin-shipping-actions';

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
  requireAdmin.mockResolvedValue({id: 'admin-user'});
});

describe('admin commerce operational recording', () => {
  test('records discount create persistence failures without exposing raw discount details', async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({data: null, error: {message: 'duplicate internal code'}}))
      }))
    }));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({insert}))
    });

    await expect(createDiscountCodeAction(discountForm())).resolves.toMatchObject({status: 'error', code: 'create_failed'});

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
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/SUMMER10|Private campaign|duplicate internal code/i);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('records discount disable failures with only the discount reference id', async () => {
    const eq = vi.fn(async () => ({error: {message: 'rls failed'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(disableDiscountCodeAction(discountId)).resolves.toMatchObject({status: 'error', code: 'disable_failed'});

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
              single: vi.fn(async () => ({data: {id: profileId}, error: null}))
            }))
          }))
        };
      }
      return {insert: vi.fn(async () => ({data: null, error: {message: 'constraint detail'}}))};
    });
    createSupabaseServerClient.mockResolvedValue({from});

    await expect(createShippingProfileAction(shippingForm())).resolves.toMatchObject({status: 'error', code: 'create_failed'});

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
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/30000|10000|Internal carrier|constraint detail/i);
  });

  test('records shipping profile deactivate failures with profile reference only', async () => {
    const eq = vi.fn(async () => ({error: {message: 'db timeout'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(deactivateShippingProfileAction(profileId)).resolves.toMatchObject({status: 'error', code: 'deactivate_failed'});

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

  test('keeps admin commerce error states when operational recording fails', async () => {
    recordOperationalFailure.mockRejectedValue(new Error('operational table unavailable'));

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({data: null, error: {message: 'discount failed'}}))
          }))
        }))
      }))
    });
    await expect(createDiscountCodeAction(discountForm())).resolves.toEqual({status: 'error', code: 'create_failed'});

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({error: {message: 'disable failed'}}))
        }))
      }))
    });
    await expect(disableDiscountCodeAction(discountId)).resolves.toEqual({status: 'error', code: 'disable_failed'});

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({data: null, error: {message: 'profile failed'}}))
          }))
        }))
      }))
    });
    await expect(createShippingProfileAction(shippingForm())).resolves.toEqual({status: 'error', code: 'create_failed'});

    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({error: {message: 'deactivate failed'}}))
        }))
      }))
    });
    await expect(deactivateShippingProfileAction(profileId)).resolves.toEqual({
      status: 'error',
      code: 'deactivate_failed'
    });
  });
});
