import {describe, expect, test, vi} from 'vitest';
vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {getCustomerOrderHistory, getCustomerPatternLibrary} from '@/fulfillment/account-queries';
import {recordOperationalFailure} from '@/operations/errors';

const ownerId = '11111111-1111-4111-8111-111111111111';

function queryResult(data: unknown[]) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({data, error: null}))
      }))
    }))
  };
}

describe('customer fulfillment account access', () => {
  test('loads only owner-scoped order history rows', async () => {
    const rows = [
      {
        order_id: 'order-1',
        order_number: 'ATB-1',
        customer_payment_status: 'paid',
        payment_status: 'paid',
        fulfillment_gate_status: 'eligible',
        digital_fulfillment_status: 'eligible',
        physical_fulfillment_status: 'awaiting_fulfillment',
        total_minor: 1200,
        currency_code: 'USD',
        updated_at: '2026-06-19T00:00:00.000Z'
      }
    ];
    const client = {from: vi.fn(() => queryResult(rows))};

    const result = await getCustomerOrderHistory({userId: ownerId, client: client as never});

    expect(result.status).toBe('success');
    expect(result.status === 'success' ? result.orders[0].orderNumber : null).toBe('ATB-1');
    expect(client.from).toHaveBeenCalledWith('order_payment_statuses');
  });

  test('groups repeated pattern purchases while preserving order history', async () => {
    const rows = [
      {
        id: 'entitlement-1',
        product_id: 'product-1',
        status: 'active',
        created_at: '2026-06-18T00:00:00.000Z',
        checkout_orders: {order_number: 'ATB-1'},
        products: {product_translations: [{locale: 'en', title: 'Tiny Bear'}]}
      },
      {
        id: 'entitlement-2',
        product_id: 'product-1',
        status: 'active',
        created_at: '2026-06-19T00:00:00.000Z',
        checkout_orders: {order_number: 'ATB-2'},
        products: {product_translations: [{locale: 'en', title: 'Tiny Bear'}]}
      }
    ];
    const client = {from: vi.fn(() => queryResult(rows))};

    const result = await getCustomerPatternLibrary({userId: ownerId, locale: 'en', client: client as never});

    expect(result).toMatchObject({status: 'success'});
    if (result.status !== 'success') throw new Error('expected success');
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0]).toMatchObject({productId: 'product-1', title: 'Tiny Bear', purchaseCount: 2});
    expect(result.patterns[0].orders.map((order) => order.orderNumber)).toEqual(['ATB-2', 'ATB-1']);
    expect(JSON.stringify(result.patterns)).not.toMatch(/token|bucket|object_path|signedUrl|entitlement-1/i);
  });

  test('records sanitized operational failures for account fulfillment query errors', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const failedQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for table checkout_orders',
              hint: 'Grant SELECT on public.checkout_orders to authenticated',
              details: 'view order_payment_statuses'
            }
          }))
        }))
      }))
    };
    const client = {from: vi.fn(() => failedQuery)};

    await expect(getCustomerOrderHistory({userId: ownerId, client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'account_orders_failed'
    });
    await expect(getCustomerPatternLibrary({userId: ownerId, locale: 'en', client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'pattern_library_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledTimes(2);
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'customer.account_orders.query_failed',
        facts: expect.objectContaining({
          action: 'account_orders',
          code: 'account_orders_failed',
          source: 'supabase.postgrest',
          authState: 'required_user_present',
          authRole: 'authenticated',
          userPresent: true,
          dbCode: '42501',
          dbMessage: 'permission denied for table checkout_orders',
          dbHint: 'Grant SELECT on public.checkout_orders to authenticated',
          dbDetails: 'view order_payment_statuses'
        })
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'customer.pattern_library.query_failed',
        facts: expect.objectContaining({
          action: 'pattern_library',
          code: 'pattern_library_failed',
          source: 'supabase.postgrest',
          authState: 'required_user_present',
          authRole: 'authenticated',
          userPresent: true,
          dbCode: '42501',
          dbMessage: 'permission denied for table checkout_orders',
          dbHint: 'Grant SELECT on public.checkout_orders to authenticated',
          dbDetails: 'view order_payment_statuses'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/owner|email|token|signedUrl/i);
  });

  test('keeps account fulfillment query error results stable when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const failedQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({data: null, error: {message: 'query failed'}}))
        }))
      }))
    };
    const client = {from: vi.fn(() => failedQuery)};

    await expect(getCustomerOrderHistory({userId: ownerId, client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'account_orders_failed'
    });
  });
});
