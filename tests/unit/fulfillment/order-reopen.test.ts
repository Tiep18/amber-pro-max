import {describe, expect, test, vi} from 'vitest';
import {redeemGuestOrderReopenToken} from '@/fulfillment/order-reopen';

type RpcCall = {fn: string; args: Record<string, unknown>};

/**
 * Redemption is now a single transactional RPC, so these tests assert the
 * boundary contract: what we send, and how each server verdict is mapped.
 * The atomicity itself (single-shot consume under concurrency) is proven in
 * `supabase/tests/database/04_guest_order_reopen_redemption.test.sql`.
 */
function makeClient(response: {data?: unknown; error?: unknown}) {
  const calls: RpcCall[] = [];
  return {
    calls,
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({fn, args});
      return Promise.resolve({data: response.data ?? null, error: response.error ?? null});
    }
  };
}

const grantedResponse = (overrides: Record<string, unknown> = {}) => ({
  status: 'granted',
  orderNumber: 'ATB-1',
  paid: false,
  reservationExpiresAt: '2026-07-01T00:00:00.000Z',
  ...overrides
});

describe('redeemGuestOrderReopenToken', () => {
  test('grants access and returns a raw secret the caller can put in a cookie', async () => {
    const client = makeClient({data: grantedResponse()});

    const result = await redeemGuestOrderReopenToken(
      {orderNumber: 'atb-1', rawToken: 'reopen-token'},
      client as never
    );

    expect(result.status).toBe('granted');
    if (result.status !== 'granted') throw new Error('expected granted');
    expect(result.orderNumber).toBe('ATB-1');
    expect(result.paid).toBe(false);
    expect(result.rawSecret).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(result.reservationExpiresAt).toBe('2026-07-01T00:00:00.000Z');
  });

  test('redeems through one atomic RPC, never a multi-step read-then-write', async () => {
    const client = makeClient({data: grantedResponse()});
    await redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never);

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].fn).toBe('redeem_guest_order_reopen_token');
  });

  test('sends only hashes, never the raw token or the new raw secret', async () => {
    const client = makeClient({data: grantedResponse()});
    const result = await redeemGuestOrderReopenToken(
      {orderNumber: 'ATB-1', rawToken: 'reopen-token'},
      client as never
    );
    if (result.status !== 'granted') throw new Error('expected granted');

    const args = client.calls[0].args;
    const serialized = JSON.stringify(args);
    expect(serialized).not.toContain('reopen-token');
    expect(serialized).not.toContain(result.rawSecret);
    expect(args.p_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_new_guest_secret_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('normalizes the order number before sending it', async () => {
    const client = makeClient({data: grantedResponse()});
    await redeemGuestOrderReopenToken({orderNumber: '  atb-1 ', rawToken: 'reopen-token'}, client as never);

    expect(client.calls[0].args.p_order_number).toBe('ATB-1');
  });

  test('reports paid orders so the caller can mint a long-lived cookie', async () => {
    const client = makeClient({data: grantedResponse({paid: true})});

    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never)
    ).resolves.toMatchObject({status: 'granted', paid: true});
  });

  test('denies whenever the server does not grant (unknown order, owned order, spent or expired token)', async () => {
    for (const data of [{status: 'denied'}, null, {status: 'granted'}]) {
      await expect(
        redeemGuestOrderReopenToken(
          {orderNumber: 'ATB-1', rawToken: 'reopen-token'},
          makeClient({data}) as never
        )
      ).resolves.toEqual({status: 'denied'});
    }
  });

  test('denies when the RPC itself errors', async () => {
    const client = makeClient({error: {message: 'write failed'}});

    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: 'reopen-token'}, client as never)
    ).resolves.toEqual({status: 'denied'});
  });

  test('rejects empty order number or token without touching the database', async () => {
    const rpc = vi.fn();
    const client = {rpc};

    await expect(
      redeemGuestOrderReopenToken({orderNumber: '  ', rawToken: 'x'}, client as never)
    ).resolves.toEqual({status: 'denied'});
    await expect(
      redeemGuestOrderReopenToken({orderNumber: 'ATB-1', rawToken: ''}, client as never)
    ).resolves.toEqual({status: 'denied'});
    expect(rpc).not.toHaveBeenCalled();
  });
});
