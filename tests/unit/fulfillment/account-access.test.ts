import {describe, expect, test, vi} from 'vitest';
vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {getCustomerOrderHistory, getCustomerPatternLibrary} from '@/fulfillment/account-queries';
import {claimGuestOrder, requestGuestOrderReopen} from '@/fulfillment/order-claim';
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
          order: vi.fn(() => Promise.resolve({data: null, error: {message: 'query failed'}}))
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
        facts: expect.objectContaining({action: 'account_orders', code: 'account_orders_failed'})
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'customer.pattern_library.query_failed',
        facts: expect.objectContaining({action: 'pattern_library', code: 'pattern_library_failed'})
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


describe('guest reopen and same-email order claim', () => {
  test('guest reopen returns generic success and enqueues email only for matching order email', async () => {
    const outboxRows: unknown[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', locale: 'en'}, error: null}))
                }))
              }))
            }))
          };
        }
        return {
          insert: vi.fn((row: unknown) => {
            outboxRows.push(row);
            return Promise.resolve({data: null, error: null});
          })
        };
      })
    };

    await expect(requestGuestOrderReopen({orderNumber: 'ATB-1', email: 'buyer@example.test', locale: 'en'}, client as never)).resolves.toEqual({status: 'sent'});

    expect(outboxRows).toEqual([
      expect.objectContaining({event_type: 'guest_order_reopen', recipient_email: 'buyer@example.test', order_id: 'order-1'})
    ]);
  });

  test('guest reopen does not enumerate missing order/email pairs', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table !== 'checkout_orders') {
          return {insert: vi.fn(() => Promise.resolve({data: null, error: null}))};
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: null, error: null}))}))
            }))
          }))
        };
      })
    };

    await expect(requestGuestOrderReopen({orderNumber: 'ATB-404', email: 'nobody@example.test', locale: 'en'}, client as never)).resolves.toEqual({status: 'sent'});
    expect(client.from).toHaveBeenCalledWith('checkout_orders');
    expect(client.from).not.toHaveBeenCalledWith('transactional_email_outbox');
  });

  test('records sanitized operational failures when guest reopen email enqueue fails', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', locale: 'en'}, error: null}))
                }))
              }))
            }))
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({data: null, error: {message: 'outbox unavailable'}}))
        };
      })
    };

    await expect(requestGuestOrderReopen({orderNumber: 'ATB-1', email: 'buyer@example.test', locale: 'en'}, client as never)).resolves.toEqual({status: 'sent'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'guest_order.reopen_email_enqueue_failed',
        facts: expect.objectContaining({action: 'guest_order_reopen', orderNumber: 'ATB-1'})
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/buyer@example|claim-token|rawToken/i);
  });

  test('keeps guest reopen response stable when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', locale: 'en'}, error: null}))
                }))
              }))
            }))
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({data: null, error: {message: 'outbox unavailable'}}))
        };
      })
    };

    await expect(requestGuestOrderReopen({orderNumber: 'ATB-1', email: 'buyer@example.test', locale: 'en'}, client as never)).resolves.toEqual({status: 'sent'});
  });

  test('claim requires same-email token proof and revokes old guest tokens', async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'guest_order_access_tokens') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'active', expires_at: new Date(Date.now() + 60_000).toISOString()}, error: null}))
                  }))
                }))
              }))
            })),
            update: vi.fn((value: unknown) => ({
              eq: vi.fn(() => {
                updates.push({table, value});
                return Promise.resolve({data: null, error: null});
              })
            }))
          };
        }
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', owner_user_id: null}, error: null}))}))})),
            update: vi.fn((value: unknown) => ({
              eq: vi.fn(() => {
                updates.push({table, value});
                return Promise.resolve({data: null, error: null});
              })
            }))
          };
        }
        return {insert: vi.fn((value: unknown) => { inserts.push({table, value}); return Promise.resolve({data: null, error: null}); })};
      })
    };

    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'buyer@example.test'}}, client as never)).resolves.toEqual({status: 'claimed'});

    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({table: 'checkout_orders', value: expect.objectContaining({owner_user_id: ownerId})}),
      expect.objectContaining({table: 'guest_order_access_tokens', value: expect.objectContaining({status: 'revoked'})})
    ]));
    expect(inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({table: 'fulfillment_audit_events', value: expect.objectContaining({event_type: 'guest_order_claim'})})
    ]));
  });

  test('claim rejects wrong-email, expired, and replayed tokens generically', async () => {
    const baseClient = (tokenRow: Record<string, unknown> | null, orderEmail = 'buyer@example.test') => ({
      from: vi.fn((table: string) => {
        if (table === 'guest_order_access_tokens') {
          return {select: vi.fn(() => ({eq: vi.fn(() => ({eq: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: tokenRow, error: null}))}))}))}))}))};
        }
        return {select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: orderEmail, owner_user_id: null}, error: null}))}))}))};
      })
    });

    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'other@example.test'}}, baseClient({id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'active', expires_at: new Date(Date.now() + 60_000).toISOString()}) as never)).resolves.toEqual({status: 'denied', code: 'claim_not_available'});
    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'buyer@example.test'}}, baseClient({id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'active', expires_at: new Date(Date.now() - 60_000).toISOString()}) as never)).resolves.toEqual({status: 'denied', code: 'claim_not_available'});
    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'buyer@example.test'}}, baseClient({id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'consumed', expires_at: new Date(Date.now() + 60_000).toISOString()}) as never)).resolves.toEqual({status: 'denied', code: 'claim_not_available'});
  });

  test('records sanitized operational failures and rejects claim when mutation returns an error', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'guest_order_access_tokens') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'active', expires_at: new Date(Date.now() + 60_000).toISOString()}, error: null}))
                  }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({data: null, error: null}))
            }))
          };
        }
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', owner_user_id: null}, error: null}))}))})),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({data: null, error: {message: 'update rejected'}}))
            }))
          };
        }
        return {insert: vi.fn(() => Promise.resolve({data: null, error: null}))};
      })
    };

    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'buyer@example.test'}}, client as never)).resolves.toEqual({status: 'error', code: 'claim_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'guest_order.claim_failed',
        facts: expect.objectContaining({action: 'guest_order_claim', orderNumber: 'ATB-1', code: 'claim_failed'})
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/buyer@example|claim-token|rawToken|token_hash/i);
  });

  test('keeps claim mutation error result stable when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'guest_order_access_tokens') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'token-1', order_id: 'order-1', contact_email: 'buyer@example.test', status: 'active', expires_at: new Date(Date.now() + 60_000).toISOString()}, error: null}))
                  }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({data: null, error: null}))
            }))
          };
        }
        if (table === 'checkout_orders') {
          return {
            select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'order-1', order_number: 'ATB-1', contact_email: 'buyer@example.test', owner_user_id: null}, error: null}))}))})),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({data: null, error: {message: 'update rejected'}}))
            }))
          };
        }
        return {insert: vi.fn(() => Promise.resolve({data: null, error: null}))};
      })
    };

    await expect(claimGuestOrder({orderNumber: 'ATB-1', rawToken: 'claim-token', user: {id: ownerId, email: 'buyer@example.test'}}, client as never)).resolves.toEqual({status: 'error', code: 'claim_failed'});
  });
});
