import {describe, expect, test} from 'vitest';
import {redeemGuestOrderReopenToken} from '@/fulfillment/order-reopen';

const activeToken = (overrides: Record<string, unknown> = {}) => ({
  id: 'token-1',
  order_id: 'order-1',
  contact_email: 'buyer@example.test',
  status: 'active',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...overrides
});

function makeClient({
  order,
  token,
  updateError,
  tokenUpdateError
}: {
  order: Record<string, unknown> | null;
  token: Record<string, unknown> | null;
  updateError?: {message: string};
  tokenUpdateError?: {message: string};
}) {
  const updates: unknown[] = [];
  return {
    updates,
    from: (table: string) => {
      if (table === 'order_payment_statuses') {
        return {
          select: () => ({
            eq: () => ({maybeSingle: () => Promise.resolve({data: order, error: null})})
          })
        };
      }
      if (table === 'guest_order_access_tokens') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({maybeSingle: () => Promise.resolve({data: token, error: null})})
              })
            })
          }),
          update: (value: unknown) => ({
            eq: () => {
              updates.push({table, value});
              return Promise.resolve({data: null, error: tokenUpdateError ?? null});
            }
          })
        };
      }
      if (table === 'checkout_orders') {
        return {
          update: (value: unknown) => ({
            eq: () => {
              updates.push({table, value});
              return Promise.resolve({data: null, error: updateError ?? null});
            }
          })
        };
      }
      throw new Error(`unexpected table ${table}`);
    }
  };
}

describe('redeemGuestOrderReopenToken', () => {
  test('grants access, consumes the token, and rotates the guest secret for an unowned order', async () => {
    const order = {
      order_id: 'order-1',
      order_number: 'ATB-1',
      owner_user_id: null,
      payment_status: 'pending',
      reservation_expires_at: '2026-07-01T00:00:00.000Z'
    };
    const client = makeClient({order, token: activeToken()});

    const result = await redeemGuestOrderReopenToken({orderNumber: 'atb-1', rawToken: 'reopen-token'}, client as never);

    expect(result.status).toBe('granted');
    if (result.status !== 'granted') throw new Error('expected granted');
    expect(result.orderNumber).toBe('ATB-1');
    expect(result.paid).toBe(false);
    expect(result.rawSecret).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(client.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({table: 'guest_order_access_tokens', value: expect.objectContaining({status: 'consumed'})}),
        expect.objectContaining({table: 'checkout_orders', value: expect.objectContaining({guest_secret_hash: expect.any(String)})})
      ])
    );
  });

  test('reports paid orders so the caller can mint a long-lived cookie', async () => {
    const order = {
      order_id: 'order-1',
      order_number: 'ATB-1',
      owner_user_id: null,
      payment_status: 'paid',
      reservation_expires_at: '2026-07-01T00:00:00.000Z'
    };
    const client = makeClient({order, token: activeToken()});

    const result = await redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never);

    expect(result).toMatchObject({status: 'granted', paid: true});
  });

  test('denies when the order does not exist', async () => {
    const client = makeClient({order: null, token: null});
    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-404', rawToken: 'reopen-token'}, client as never)
    ).resolves.toEqual({status: 'denied'});
  });

  test('denies when the order already has an owner account (claim flow applies instead)', async () => {
    const order = {
      order_id: 'order-1',
      order_number: 'ATB-1',
      owner_user_id: 'user-1',
      payment_status: 'paid',
      reservation_expires_at: '2026-07-01T00:00:00.000Z'
    };
    const client = makeClient({order, token: activeToken()});
    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never)
    ).resolves.toEqual({status: 'denied'});
    expect(client.updates).toEqual([]);
  });

  test('denies expired, consumed, or mismatched tokens', async () => {
    const order = {
      order_id: 'order-1',
      order_number: 'ATB-1',
      owner_user_id: null,
      payment_status: 'pending',
      reservation_expires_at: '2026-07-01T00:00:00.000Z'
    };

    await expect(
      redeemGuestOrderReopenToken(
        {orderNumber: 'ATB-1', rawToken: 'x'},
        makeClient({order, token: activeToken({status: 'consumed'})}) as never
      )
    ).resolves.toEqual({status: 'denied'});

    await expect(
      redeemGuestOrderReopenToken(
        {orderNumber: 'ATB-1', rawToken: 'x'},
        makeClient({order, token: activeToken({expires_at: new Date(Date.now() - 1000).toISOString()})}) as never
      )
    ).resolves.toEqual({status: 'denied'});

    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'x'}, makeClient({order, token: null}) as never)
    ).resolves.toEqual({status: 'denied'});
  });

  test('denies when rotating the guest secret fails', async () => {
    const order = {
      order_id: 'order-1',
      order_number: 'ATB-1',
      owner_user_id: null,
      payment_status: 'pending',
      reservation_expires_at: '2026-07-01T00:00:00.000Z'
    };
    const client = makeClient({order, token: activeToken(), updateError: {message: 'write failed'}});

    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never)
    ).resolves.toEqual({status: 'denied'});
  });

  test('rejects empty order number or token without querying the database', async () => {
    let calls = 0;
    const client = {from: () => { calls += 1; return {}; }};

    await expect(redeemGuestOrderReopenToken({orderNumber: '  ', rawToken: 'x'}, client as never)).resolves.toEqual({status: 'denied'});
    await expect(redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: ''}, client as never)).resolves.toEqual({status: 'denied'});
    expect(calls).toBe(0);
  });
});
