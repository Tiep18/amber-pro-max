import { createHash } from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { hashFulfillmentAccessToken } from '@/fulfillment/downloads';
import {
  buildGuestOrderCookieName,
  createOrderAccess,
  DEFAULT_ORDER_ACCESS_POLICY,
  GUEST_CHECKOUT_RECOVERY_COOKIE,
  hashOrderAccessToken,
  type OrderAccessCookieOptions,
  type OrderAccessCookieStore,
  type OrderAccessOperationalFailure,
  type OrderAccessStore,
  type OrderAccessUser
} from '@/order-access/order-access';
import { createSupabaseOrderAccessStore } from '@/order-access/server';
import type { CustomerOrderPaymentProjection } from '@/payments/queries';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const BASE_NOW_MS = Date.parse('2026-08-01T10:00:00.000Z');

function makeProjection(
  overrides: Partial<CustomerOrderPaymentProjection> = {}
): CustomerOrderPaymentProjection {
  return {
    orderNumber: 'ATB-20260801-0001',
    customerPaymentStatus: 'awaiting_payment',
    paymentStatus: 'pending',
    fulfillmentGateStatus: 'locked',
    provider: 'vietqr',
    paymentIntent: 'vietqr_intent',
    market: 'vn',
    amountMinor: 250_000,
    currencyCode: 'VND',
    reservationExpiresAt: '2026-08-01T12:00:00.000Z',
    customerTransferDeclaredAt: null,
    shippingAddress: null,
    contactEmailMasked: 'b***@example.test',
    lines: [],
    money: {
      subtotalMinor: 250_000,
      discountMinor: 0,
      shippingMinor: 0,
      totalMinor: 250_000,
      discountCode: null
    },
    ...overrides
  };
}

function createInMemoryCookieStore(
  initial: Record<string, string> = {}
): OrderAccessCookieStore & {
  values: Map<string, string>;
  setCalls: Array<{ name: string; value: string; options: OrderAccessCookieOptions }>;
  deleteCalls: string[];
} {
  const values = new Map<string, string>(Object.entries(initial));
  const setCalls: Array<{
    name: string;
    value: string;
    options: OrderAccessCookieOptions;
  }> = [];
  const deleteCalls: string[] = [];

  return {
    values,
    setCalls,
    deleteCalls,
    get(name) {
      return values.has(name) ? { value: values.get(name)! } : undefined;
    },
    set(name, value, options) {
      values.set(name, value);
      setCalls.push({ name, value, options });
    },
    delete(name) {
      values.delete(name);
      deleteCalls.push(name);
    }
  };
}

type StoredOrderState = {
  orderId: string;
  orderNumber: string;
  ownerUserId: string | null;
  contactEmail: string;
  guestSecretHash: string | null;
  projection: CustomerOrderPaymentProjection;
  reopenTokenHashes: Set<string>;
  claimTokenHashes: Set<string>;
};

function createInMemoryOrderAccessStore(seed?: {
  user?: OrderAccessUser | null;
  orders?: StoredOrderState[];
}): OrderAccessStore & {
  orders: Map<string, StoredOrderState>;
  findCalls: Array<{ orderNumber: string; guestSecretHash: string | null }>;
  getUserCalls: number;
  emailRequests: Array<Parameters<OrderAccessStore['requestGuestOrderEmail']>[0]>;
  setCurrentUser: (user: OrderAccessUser | null) => void;
  emailRequestOutcome: { status: 'sent' } | { status: 'failed' } | 'throw';
  claimFailureStage:
    | null
    | 'order_update_failed'
    | 'token_revoke_failed'
    | 'audit_insert_failed'
    | 'unexpected_exception'
    | 'throw';
} {
  let currentUser: OrderAccessUser | null = seed?.user ?? null;
  const orders = new Map<string, StoredOrderState>();
  for (const order of seed?.orders ?? []) {
    orders.set(order.orderNumber.trim().toUpperCase(), order);
  }

  const findCalls: Array<{ orderNumber: string; guestSecretHash: string | null }> =
    [];
  let getUserCalls = 0;
  const emailRequests: Array<
    Parameters<OrderAccessStore['requestGuestOrderEmail']>[0]
  > = [];

  const store = {
    orders,
    findCalls,
    get getUserCalls() {
      return getUserCalls;
    },
    emailRequests,
    emailRequestOutcome: { status: 'sent' } as
      | { status: 'sent' }
      | { status: 'failed' }
      | 'throw',
    claimFailureStage: null as
      | null
      | 'order_update_failed'
      | 'token_revoke_failed'
      | 'audit_insert_failed'
      | 'unexpected_exception'
      | 'throw',
    setCurrentUser(user: OrderAccessUser | null) {
      currentUser = user;
    },
    async getCurrentUser() {
      getUserCalls += 1;
      return currentUser;
    },
    async findAuthorizedOrder(input: {
      orderNumber: string;
      guestSecretHash: string | null;
    }) {
      findCalls.push(input);
      const record = orders.get(input.orderNumber.trim().toUpperCase());
      if (!record) {
        return { status: 'not_found' } as const;
      }
      const ownerMatches =
        Boolean(currentUser?.id) && record.ownerUserId === currentUser?.id;
      const guestMatches =
        Boolean(input.guestSecretHash) &&
        !record.ownerUserId &&
        record.guestSecretHash === input.guestSecretHash;
      if (!ownerMatches && !guestMatches) {
        return { status: 'not_found' } as const;
      }
      return { status: 'found', order: record.projection } as const;
    },
    async requestGuestOrderEmail(
      input: Parameters<OrderAccessStore['requestGuestOrderEmail']>[0]
    ) {
      emailRequests.push(input);
      if (store.emailRequestOutcome === 'throw') {
        throw new Error('private quota failure');
      }
      return store.emailRequestOutcome;
    },
    async redeemReopenToken(
      input: Parameters<OrderAccessStore['redeemReopenToken']>[0]
    ) {
      const record = orders.get(input.orderNumber.trim().toUpperCase());
      if (
        !record ||
        record.ownerUserId ||
        !record.reopenTokenHashes.has(input.tokenHash)
      ) {
        return { status: 'denied' } as const;
      }
      record.reopenTokenHashes.delete(input.tokenHash);
      record.guestSecretHash = input.newGuestSecretHash;
      const paid =
        record.projection.paymentStatus === 'paid' ||
        record.projection.paymentStatus === 'partially_refunded' ||
        record.projection.paymentStatus === 'refunded';
      return {
        status: 'granted',
        orderNumber: record.orderNumber,
        paid,
        reservationExpiresAt: record.projection.reservationExpiresAt
      } as const;
    },
    async claimOrder(input: Parameters<OrderAccessStore['claimOrder']>[0]) {
      const record = orders.get(input.orderNumber.trim().toUpperCase());
      if (
        !record ||
        record.ownerUserId ||
        record.contactEmail.trim().toLowerCase() !==
          input.userEmail.trim().toLowerCase() ||
        !record.claimTokenHashes.has(input.tokenHash)
      ) {
        return { status: 'denied' } as const;
      }
      if (store.claimFailureStage === 'throw') {
        throw new Error('database crash');
      }
      if (store.claimFailureStage) {
        return {
          status: 'failed',
          stage: store.claimFailureStage,
          orderId: record.orderId,
          orderNumber: record.orderNumber
        } as const;
      }
      record.ownerUserId = input.userId;
      record.guestSecretHash = null;
      record.reopenTokenHashes.clear();
      record.claimTokenHashes.clear();
      return {
        status: 'claimed',
        orderId: record.orderId,
        orderNumber: record.orderNumber
      } as const;
    }
  };

  return store;
}

describe('Order Access module scenarios', () => {
  test('hashes raw secrets with SHA-256 and shares the hash utility with downloads', () => {
    expect(hashOrderAccessToken('raw-guest-token')).toBe(
      '5b09b3bd2cc307168ebae2cebd35bef0b93738b0cd8635c4d269895e2fcc793f'
    );
    expect(hashFulfillmentAccessToken).toBe(hashOrderAccessToken);
    expect(buildGuestOrderCookieName('  atb 2026_1 ')).toBe(
      'atb_guest_order_ATB-2026-1'
    );
  });

  test('runs the full guest lifecycle: recovery prepare -> order session open -> authorize -> refresh on settlement -> ack', async () => {
    let nowMs = BASE_NOW_MS;
    const cookies = createInMemoryCookieStore();
    const store = createInMemoryOrderAccessStore();
    const orderAccess = createOrderAccess({
      cookies,
      store,
      production: true,
      now: () => nowMs
    });

    await expect(orderAccess.prepareGuestRecovery('intent-a')).resolves.toEqual({
      status: 'ready'
    });
    expect(cookies.setCalls).toHaveLength(1);
    expect(cookies.setCalls[0]).toMatchObject({
      name: GUEST_CHECKOUT_RECOVERY_COOKIE,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: DEFAULT_ORDER_ACCESS_POLICY.recoveryMaxAgeSeconds
      }
    });

    // Reuses matching valid recovery without rotating cookie.
    nowMs += 1_000;
    await orderAccess.prepareGuestRecovery('intent-a');
    expect(cookies.setCalls).toHaveLength(1);

    // Wrong intent fails closed.
    await expect(orderAccess.resolveCheckoutActor('intent-b')).resolves.toEqual({
      kind: 'guest_recovery_required'
    });

    const actor = await orderAccess.resolveCheckoutActor('intent-a');
    expect(actor.kind).toBe('guest');
    if (actor.kind !== 'guest') {
      throw new Error('expected guest checkout actor');
    }
    expect(actor.guestRecovery.attemptId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(actor.guestRecovery.proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(actor.guestRecovery.attemptId).not.toBe(actor.guestRecovery.proof);

    // Seed resulting order in store using proof hash (mirrors submit_checkout).
    const orderNumber = 'ATB-20260801-0001';
    const orderState: StoredOrderState = {
      orderId: 'order-1',
      orderNumber,
      ownerUserId: null,
      contactEmail: 'buyer@example.test',
      guestSecretHash: hashOrderAccessToken(actor.guestRecovery.proof),
      projection: makeProjection({ orderNumber }),
      reopenTokenHashes: new Set(),
      claimTokenHashes: new Set()
    };
    store.orders.set(orderNumber, orderState);

    const cookieResult = await actor.openOrderSession({
      orderNumber,
      reservationExpiresAt: '2026-08-01T12:00:00.000Z'
    });
    expect(cookieResult).toEqual({
      status: 'set',
      cookieName: buildGuestOrderCookieName(orderNumber)
    });

    // Before settlement, refresh keeps the 24h cookie untouched.
    await expect(
      orderAccess.refreshGuestOrderSession(orderNumber)
    ).resolves.toEqual({ status: 'skipped' });

    // Order Access authorizes the guest order using the cookie hash.
    await expect(orderAccess.authorizeOrder(orderNumber)).resolves.toMatchObject({
      status: 'authorized',
      isSignedIn: false,
      userId: null,
      order: { orderNumber }
    });

    // After payment settlement, refresh extends cookie to 30 days.
    orderState.projection = makeProjection({
      orderNumber,
      paymentStatus: 'paid',
      customerPaymentStatus: 'paid',
      fulfillmentGateStatus: 'eligible'
    });
    await expect(
      orderAccess.refreshGuestOrderSession(orderNumber)
    ).resolves.toEqual({ status: 'refreshed' });
    const latestOrderCookie = cookies.setCalls.at(-1);
    expect(latestOrderCookie).toMatchObject({
      name: buildGuestOrderCookieName(orderNumber),
      options: {
        httpOnly: true,
        maxAge: DEFAULT_ORDER_ACCESS_POLICY.paidGuestOrderMaxAgeSeconds
      }
    });

    // Acknowledgements clear the temporary recovery cookie only when verified.
    await expect(
      orderAccess.acknowledgeGuestRecovery(orderNumber)
    ).resolves.toEqual({ status: 'cleared' });
    expect(cookies.values.has(GUEST_CHECKOUT_RECOVERY_COOKIE)).toBe(false);
    expect(cookies.deleteCalls).toContain(GUEST_CHECKOUT_RECOVERY_COOKIE);
  });

  test('extends guest session to 30 days across all isPaid statuses and skips non-paid statuses', async () => {
    for (const status of ['paid', 'partially_refunded', 'refunded'] as const) {
      const orderNumber = `ATB-${status.toUpperCase()}`;
      const cookies = createInMemoryCookieStore({
        [buildGuestOrderCookieName(orderNumber)]: 'guest-secret'
      });
      const store = createInMemoryOrderAccessStore({
        orders: [
          {
            orderId: `order-${status}`,
            orderNumber,
            ownerUserId: null,
            contactEmail: 'buyer@example.test',
            guestSecretHash: hashOrderAccessToken('guest-secret'),
            projection: makeProjection({
              orderNumber,
              paymentStatus: status,
              customerPaymentStatus: status
            }),
            reopenTokenHashes: new Set(),
            claimTokenHashes: new Set()
          }
        ]
      });
      const orderAccess = createOrderAccess({ cookies, store, production: true });

      await expect(
        orderAccess.refreshGuestOrderSession(orderNumber)
      ).resolves.toEqual({ status: 'refreshed' });
      expect(cookies.setCalls[0]?.options.maxAge).toBe(
        DEFAULT_ORDER_ACCESS_POLICY.paidGuestOrderMaxAgeSeconds
      );
    }

    for (const [paymentStatus, customerPaymentStatus] of [
      ['pending', 'awaiting_payment'],
      ['verifying', 'verifying_payment'],
      ['failed', 'payment_failed'],
      ['cancelled', 'payment_cancelled'],
      ['rejected', 'payment_failed'],
      ['expired', 'expired'],
      ['review_required', 'review_required']
    ] as const) {
      const orderNumber = `ATB-${paymentStatus.toUpperCase()}`;
      const cookies = createInMemoryCookieStore({
        [buildGuestOrderCookieName(orderNumber)]: 'guest-secret'
      });
      const store = createInMemoryOrderAccessStore({
        orders: [
          {
            orderId: `order-${paymentStatus}`,
            orderNumber,
            ownerUserId: null,
            contactEmail: 'buyer@example.test',
            guestSecretHash: hashOrderAccessToken('guest-secret'),
            projection: makeProjection({
              orderNumber,
              paymentStatus,
              customerPaymentStatus
            }),
            reopenTokenHashes: new Set(),
            claimTokenHashes: new Set()
          }
        ]
      });
      const orderAccess = createOrderAccess({ cookies, store, production: true });

      await expect(
        orderAccess.refreshGuestOrderSession(orderNumber)
      ).resolves.toEqual({ status: 'skipped' });
      expect(cookies.setCalls).toHaveLength(0);
    }
  });

  test('keeps minimum 24h expiry for past deadlines and preserves future reservation deadlines >24h', async () => {
    const cookies = createInMemoryCookieStore();
    const store = createInMemoryOrderAccessStore();
    const orderAccess = createOrderAccess({
      cookies,
      store,
      production: true,
      now: () => BASE_NOW_MS
    });

    await orderAccess.prepareGuestRecovery('intent-ttl');
    const actor = await orderAccess.resolveCheckoutActor('intent-ttl');
    if (actor.kind !== 'guest') throw new Error('expected guest');

    await actor.openOrderSession({
      orderNumber: 'ATB-PAST',
      reservationExpiresAt: '2020-01-01T00:00:00.000Z'
    });
    const pastExpiry = cookies.setCalls.at(-1)?.options.expires;
    expect(pastExpiry?.toISOString()).toBe(
      new Date(
        BASE_NOW_MS + DEFAULT_ORDER_ACCESS_POLICY.defaultGuestOrderMaxAgeSeconds * 1000
      ).toISOString()
    );

    const futureIso = '2026-08-05T10:00:00.000Z';
    await actor.openOrderSession({
      orderNumber: 'ATB-FUTURE',
      reservationExpiresAt: futureIso
    });
    const futureExpiry = cookies.setCalls.at(-1)?.options.expires;
    expect(futureExpiry?.toISOString()).toBe(futureIso);
  });

  test('rotates malformed, expired, and differently-bound recovery cookies and skips for signed-in buyers', async () => {
    let nowMs = BASE_NOW_MS;
    const cookies = createInMemoryCookieStore({
      [GUEST_CHECKOUT_RECOVERY_COOKIE]: 'malformed-value'
    });
    const store = createInMemoryOrderAccessStore();
    const orderAccess = createOrderAccess({
      cookies,
      store,
      production: true,
      now: () => nowMs
    });

    await orderAccess.prepareGuestRecovery('intent-a');
    const firstEncoded = cookies.values.get(GUEST_CHECKOUT_RECOVERY_COOKIE);
    expect(firstEncoded).toBeTruthy();

    await orderAccess.prepareGuestRecovery('intent-b');
    const secondEncoded = cookies.values.get(GUEST_CHECKOUT_RECOVERY_COOKIE);
    expect(secondEncoded).not.toBe(firstEncoded);

    // Expire past the 30-minute recovery window -> rotated & unaccepted before refresh.
    nowMs += (DEFAULT_ORDER_ACCESS_POLICY.recoveryMaxAgeSeconds + 1) * 1000;
    await expect(orderAccess.resolveCheckoutActor('intent-b')).resolves.toEqual({
      kind: 'guest_recovery_required'
    });

    // Signed-in users bypass guest recovery completely.
    store.setCurrentUser({ id: OWNER_ID, email: 'buyer@example.test' });
    const countBefore = cookies.setCalls.length;
    await expect(orderAccess.prepareGuestRecovery('intent-c')).resolves.toEqual({
      status: 'ready'
    });
    expect(cookies.setCalls).toHaveLength(countBefore);
    await expect(orderAccess.resolveCheckoutActor(null)).resolves.toEqual({
      kind: 'account',
      userId: OWNER_ID
    });
  });

  test('keeps recovery cookie when proof mismatches or order authorization fails', async () => {
    const cookies = createInMemoryCookieStore();
    const store = createInMemoryOrderAccessStore();
    const orderAccess = createOrderAccess({
      cookies,
      store,
      now: () => BASE_NOW_MS
    });

    await orderAccess.prepareGuestRecovery('intent-ack');
    cookies.values.set(buildGuestOrderCookieName('ATB-ACK'), 'wrong-proof');
    await expect(
      orderAccess.acknowledgeGuestRecovery('ATB-ACK')
    ).resolves.toEqual({ status: 'kept' });
    expect(store.findCalls).toHaveLength(0);
    expect(cookies.values.has(GUEST_CHECKOUT_RECOVERY_COOKIE)).toBe(true);

    // Put matching proof into order cookie without seeding an authorized order in DB.
    const actor = await orderAccess.resolveCheckoutActor('intent-ack');
    if (actor.kind !== 'guest') throw new Error('expected guest');
    await actor.openOrderSession({ orderNumber: 'ATB-ACK' });

    await expect(
      orderAccess.acknowledgeGuestRecovery('ATB-ACK')
    ).resolves.toEqual({ status: 'kept' });
    expect(store.findCalls).toHaveLength(1);
    expect(cookies.values.has(GUEST_CHECKOUT_RECOVERY_COOKIE)).toBe(true);
  });

  test('short-circuits authorizeOrder before DB without credentials and avoids getUser in readGuestSecretHash', async () => {
    const cookies = createInMemoryCookieStore();
    const store = createInMemoryOrderAccessStore();
    const orderAccess = createOrderAccess({ cookies, store });

    await expect(orderAccess.authorizeOrder('   ')).resolves.toEqual({
      status: 'not_found'
    });
    await expect(orderAccess.authorizeOrder('ATB-1')).resolves.toEqual({
      status: 'not_found'
    });
    expect(store.findCalls).toHaveLength(0);

    // readGuestSecretHash reads & hashes the cookie without triggering auth lookup.
    const userCallsBefore = store.getUserCalls;
    cookies.values.set(buildGuestOrderCookieName('ATB-1'), 'guest-secret');
    await expect(orderAccess.readGuestSecretHash('ATB-1')).resolves.toBe(
      hashOrderAccessToken('guest-secret')
    );
    expect(store.getUserCalls).toBe(userCallsBefore);

    // resolveCredentials surfaces both ownerUserId and guestSecretHash.
    store.setCurrentUser({ id: OWNER_ID, email: 'buyer@example.test' });
    await expect(orderAccess.resolveCredentials('ATB-1')).resolves.toEqual({
      ownerUserId: OWNER_ID,
      guestSecretHash: hashOrderAccessToken('guest-secret')
    });
  });

  test('redeems single-shot reopen tokens, rotates guest secret, and sets HttpOnly cookie without returning raw secret', async () => {
    const cookies = createInMemoryCookieStore({
      [buildGuestOrderCookieName('ATB-REOPEN')]: 'stale-secret'
    });
    const reopenToken = 'emailed-reopen-token';
    const orderState: StoredOrderState = {
      orderId: 'order-reopen',
      orderNumber: 'ATB-REOPEN',
      ownerUserId: null,
      contactEmail: 'buyer@example.test',
      guestSecretHash: hashOrderAccessToken('stale-secret'),
      projection: makeProjection({
        orderNumber: 'ATB-REOPEN',
        paymentStatus: 'paid',
        customerPaymentStatus: 'paid',
        fulfillmentGateStatus: 'eligible'
      }),
      reopenTokenHashes: new Set([hashOrderAccessToken(reopenToken)]),
      claimTokenHashes: new Set()
    };
    const store = createInMemoryOrderAccessStore({ orders: [orderState] });
    const orderAccess = createOrderAccess({
      cookies,
      store,
      production: true,
      generateSecret: () => 'fresh-rotated-secret-value'
    });

    const firstRedeem = await orderAccess.redeemOrderReopen({
      orderNumber: ' atb-reopen ',
      rawToken: reopenToken
    });
    expect(firstRedeem).toEqual({
      status: 'granted',
      orderNumber: 'ATB-REOPEN'
    });
    expect(JSON.stringify(firstRedeem)).not.toContain('fresh-rotated-secret-value');
    expect(
      cookies.values.get(buildGuestOrderCookieName('ATB-REOPEN'))
    ).toBe('fresh-rotated-secret-value');
    expect(cookies.setCalls[0]?.options.maxAge).toBe(
      DEFAULT_ORDER_ACCESS_POLICY.paidGuestOrderMaxAgeSeconds
    );
    expect(orderState.guestSecretHash).toBe(
      hashOrderAccessToken('fresh-rotated-secret-value')
    );

    // Replaying the same reopen link is denied and preserves current valid cookie.
    await expect(
      orderAccess.redeemOrderReopen({
        orderNumber: 'ATB-REOPEN',
        rawToken: reopenToken
      })
    ).resolves.toEqual({ status: 'denied' });
    expect(
      cookies.values.get(buildGuestOrderCookieName('ATB-REOPEN'))
    ).toBe('fresh-rotated-secret-value');

    // Empty inputs fail closed before calling store.
    await expect(
      orderAccess.redeemOrderReopen({ orderNumber: ' ', rawToken: 'x' })
    ).resolves.toEqual({ status: 'denied' });
    await expect(
      orderAccess.redeemOrderReopen({ orderNumber: 'ATB-REOPEN', rawToken: '' })
    ).resolves.toEqual({ status: 'denied' });
  });

  test('handles public email reopen/claim requests uniformly and sanitizes recorded failures', async () => {
    const cookies = createInMemoryCookieStore();
    const store = createInMemoryOrderAccessStore();
    const recordedFailures: OrderAccessOperationalFailure[] = [];
    const orderAccess = createOrderAccess({
      cookies,
      store,
      recordOperationalFailure: async (failure) => {
        recordedFailures.push(failure);
      }
    });

    const evidence = {
      targetHash: 'c'.repeat(64),
      ipHash: 'd'.repeat(64)
    };

    // Valid reopen & claim email requests forward normalized inputs.
    await expect(
      orderAccess.requestGuestOrderEmail({
        purpose: 'reopen_order',
        orderNumber: ' atb-1 ',
        email: ' BUYER@EXAMPLE.TEST ',
        locale: 'en',
        ...evidence
      })
    ).resolves.toEqual({ status: 'sent' });
    await expect(
      orderAccess.requestGuestOrderEmail({
        purpose: 'claim_order',
        orderNumber: 'atb-1',
        email: 'buyer@example.test',
        locale: 'vi',
        ...evidence
      })
    ).resolves.toEqual({ status: 'sent' });
    expect(store.emailRequests).toEqual([
      {
        purpose: 'reopen_order',
        orderNumber: 'ATB-1',
        email: 'buyer@example.test',
        locale: 'en',
        ...evidence
      },
      {
        purpose: 'claim_order',
        orderNumber: 'ATB-1',
        email: 'buyer@example.test',
        locale: 'vi',
        ...evidence
      }
    ]);

    // Invalid input stays indistinguishable.
    await expect(
      orderAccess.requestGuestOrderEmail({
        purpose: 'reopen_order',
        orderNumber: 'ATB-1',
        email: 'not-an-email',
        locale: 'en',
        ...evidence
      })
    ).resolves.toEqual({ status: 'sent' });

    // Store failure records sanitized error without exposing email or hashes.
    store.emailRequestOutcome = { status: 'failed' };
    await expect(
      orderAccess.requestGuestOrderEmail({
        purpose: 'claim_order',
        orderNumber: 'ATB-1',
        email: 'buyer@example.test',
        locale: 'en',
        ...evidence
      })
    ).resolves.toEqual({ status: 'sent' });
    expect(recordedFailures).toEqual([
      expect.objectContaining({
        action: 'guest_order_claim_email',
        errorCode: 'guest_order.claim_email_request_failed',
        orderNumber: 'ATB-1'
      })
    ]);
    expect(JSON.stringify(recordedFailures)).not.toMatch(
      /buyer@example|cccccccc|dddddddd/i
    );

    // Recorder throw never breaks customer result.
    const throwingRecorderAccess = createOrderAccess({
      cookies,
      store: { ...store, emailRequestOutcome: 'throw' } as OrderAccessStore,
      recordOperationalFailure: async () => {
        throw new Error('monitoring offline');
      }
    });
    await expect(
      throwingRecorderAccess.requestGuestOrderEmail({
        purpose: 'reopen_order',
        orderNumber: 'ATB-1',
        email: 'buyer@example.test',
        locale: 'en',
        ...evidence
      })
    ).resolves.toEqual({ status: 'sent' });
  });

  test('claims unowned orders for same-email users, clears guest cookie, and isolates stage failures', async () => {
    const orderNumber = 'ATB-CLAIM-1';
    const rawClaimToken = 'raw-claim-secret';
    const orderState: StoredOrderState = {
      orderId: 'order-claim-1',
      orderNumber,
      ownerUserId: null,
      contactEmail: 'Buyer@Example.test',
      guestSecretHash: hashOrderAccessToken('old-guest-secret'),
      projection: makeProjection({ orderNumber }),
      reopenTokenHashes: new Set([hashOrderAccessToken('old-reopen')]),
      claimTokenHashes: new Set([hashOrderAccessToken(rawClaimToken)])
    };
    const cookies = createInMemoryCookieStore({
      [buildGuestOrderCookieName(orderNumber)]: 'old-guest-secret'
    });
    const store = createInMemoryOrderAccessStore({ orders: [orderState] });
    const failures: OrderAccessOperationalFailure[] = [];
    const orderAccess = createOrderAccess({
      cookies,
      store,
      recordOperationalFailure: async (f) => {
        failures.push(f);
      }
    });

    // Invalid input -> invalid_claim_request.
    await expect(
      orderAccess.claimGuestOrder({
        orderNumber: ' ',
        rawToken: '',
        user: { id: 'not-uuid', email: 'bad' }
      })
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_claim_request' });

    // Wrong email -> claim_not_available, keeps token & guest cookie intact.
    await expect(
      orderAccess.claimGuestOrder({
        orderNumber,
        rawToken: rawClaimToken,
        user: { id: OWNER_ID, email: 'other@example.test' }
      })
    ).resolves.toEqual({ status: 'denied', code: 'claim_not_available' });
    expect(cookies.values.has(buildGuestOrderCookieName(orderNumber))).toBe(true);

    // Stage failure -> records sanitized operational failure without leaking token or email.
    store.claimFailureStage = 'token_revoke_failed';
    await expect(
      orderAccess.claimGuestOrder({
        orderNumber,
        rawToken: rawClaimToken,
        user: { id: OWNER_ID, email: 'buyer@example.test' }
      })
    ).resolves.toEqual({ status: 'error', code: 'claim_failed' });
    expect(failures[0]).toMatchObject({
      action: 'guest_order_claim',
      errorCode: 'guest_order.claim_failed',
      orderNumber,
      referenceId: 'order-claim-1',
      status: 'token_revoke_failed'
    });
    expect(JSON.stringify(failures)).not.toMatch(
      /buyer@example|raw-claim-secret/i
    );

    // Successful claim transfers order, clears stale cookie, and rejects token replay.
    store.claimFailureStage = null;
    await expect(
      orderAccess.claimGuestOrder({
        orderNumber,
        rawToken: rawClaimToken,
        user: { id: OWNER_ID, email: 'buyer@example.test' }
      })
    ).resolves.toEqual({ status: 'claimed' });
    expect(orderState.ownerUserId).toBe(OWNER_ID);
    expect(
      cookies.values.has(buildGuestOrderCookieName(orderNumber))
    ).toBe(false);

    await expect(
      orderAccess.claimGuestOrder({
        orderNumber,
        rawToken: rawClaimToken,
        user: { id: OWNER_ID, email: 'buyer@example.test' }
      })
    ).resolves.toEqual({ status: 'denied', code: 'claim_not_available' });
  });
});

describe('createSupabaseOrderAccessStore adapter contracts', () => {
  test('calls request_guest_order_email and redeem_guest_order_reopen_token via admin RPC without direct table queries', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { status: 'sent' }, error: null })
      .mockResolvedValueOnce({
        data: {
          status: 'granted',
          orderNumber: 'ATB-1',
          paid: true,
          reservationExpiresAt: '2026-08-01T12:00:00.000Z'
        },
        error: null
      });
    const from = vi.fn();

    const store = createSupabaseOrderAccessStore({
      getServerClient: () => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
        rpc: vi.fn(async () => ({ data: null, error: null }))
      }),
      getAdminClient: () => ({ from: from as never, rpc })
    });

    await expect(
      store.requestGuestOrderEmail({
        orderNumber: 'ATB-1',
        email: 'buyer@example.test',
        locale: 'en',
        purpose: 'reopen_order',
        targetHash: 'a'.repeat(64),
        ipHash: 'b'.repeat(64)
      })
    ).resolves.toEqual({ status: 'sent' });

    const tokenHash = createHash('sha256').update('reopen').digest('hex');
    const secretHash = createHash('sha256').update('secret').digest('hex');
    await expect(
      store.redeemReopenToken({
        orderNumber: 'ATB-1',
        tokenHash,
        newGuestSecretHash: secretHash
      })
    ).resolves.toEqual({
      status: 'granted',
      orderNumber: 'ATB-1',
      paid: true,
      reservationExpiresAt: '2026-08-01T12:00:00.000Z'
    });

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenNthCalledWith(1, 'request_guest_order_email', {
      p_order_number: 'ATB-1',
      p_email: 'buyer@example.test',
      p_locale: 'en',
      p_purpose: 'reopen_order',
      p_target_hash: 'a'.repeat(64),
      p_ip_hash: 'b'.repeat(64)
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'redeem_guest_order_reopen_token', {
      p_order_number: 'ATB-1',
      p_token_hash: tokenHash,
      p_new_guest_secret_hash: secretHash
    });
  });

  test('claimOrder verifies same-email active token, performs 3 writes, and surfaces stage errors', async () => {
    const buildClient = (options?: {
      orderOwner?: string | null;
      tokenStatus?: string;
      expiresAt?: string;
      orderUpdateError?: unknown;
    }) => {
      const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
      const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
      return {
        updates,
        inserts,
        client: {
          rpc: vi.fn(),
          from: vi.fn((table: string) => {
            if (table === 'checkout_orders') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: 'order-1',
                        order_number: 'ATB-1',
                        contact_email: 'buyer@example.test',
                        owner_user_id: options?.orderOwner ?? null
                      },
                      error: null
                    }))
                  }))
                })),
                update: vi.fn((value: Record<string, unknown>) => ({
                  eq: vi.fn(async () => {
                    updates.push({ table, value });
                    return {
                      data: null,
                      error: options?.orderUpdateError ?? null
                    };
                  })
                }))
              };
            }
            if (table === 'guest_order_access_tokens') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({
                          data: {
                            id: 'token-1',
                            order_id: 'order-1',
                            contact_email: 'buyer@example.test',
                            status: options?.tokenStatus ?? 'active',
                            expires_at:
                              options?.expiresAt ?? '2026-08-02T00:00:00.000Z'
                          },
                          error: null
                        }))
                      }))
                    }))
                  }))
                })),
                update: vi.fn((value: Record<string, unknown>) => ({
                  eq: vi.fn(async () => {
                    updates.push({ table, value });
                    return { data: null, error: null };
                  })
                }))
              };
            }
            return {
              insert: vi.fn(async (value: Record<string, unknown>) => {
                inserts.push({ table, value });
                return { data: null, error: null };
              })
            };
          })
        }
      };
    };

    const serverClient = {
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
      rpc: vi.fn(async () => ({ data: null, error: null }))
    };

    const okHarness = buildClient();
    const okStore = createSupabaseOrderAccessStore({
      getServerClient: () => serverClient,
      getAdminClient: () => okHarness.client as never
    });
    await expect(
      okStore.claimOrder({
        orderNumber: 'ATB-1',
        tokenHash: 'e'.repeat(64),
        userId: OWNER_ID,
        userEmail: 'BUYER@example.test',
        nowIso: '2026-08-01T10:00:00.000Z'
      })
    ).resolves.toEqual({
      status: 'claimed',
      orderId: 'order-1',
      orderNumber: 'ATB-1'
    });
    expect(okHarness.updates).toEqual([
      {
        table: 'checkout_orders',
        value: expect.objectContaining({ owner_user_id: OWNER_ID })
      },
      {
        table: 'guest_order_access_tokens',
        value: expect.objectContaining({ status: 'revoked' })
      }
    ]);
    expect(okHarness.inserts).toEqual([
      {
        table: 'fulfillment_audit_events',
        value: expect.objectContaining({ event_type: 'guest_order_claim' })
      }
    ]);

    const expiredStore = createSupabaseOrderAccessStore({
      getServerClient: () => serverClient,
      getAdminClient: () =>
        buildClient({ expiresAt: '2026-07-31T00:00:00.000Z' }).client as never
    });
    await expect(
      expiredStore.claimOrder({
        orderNumber: 'ATB-1',
        tokenHash: 'e'.repeat(64),
        userId: OWNER_ID,
        userEmail: 'buyer@example.test',
        nowIso: '2026-08-01T10:00:00.000Z'
      })
    ).resolves.toEqual({ status: 'denied' });

    const errorStore = createSupabaseOrderAccessStore({
      getServerClient: () => serverClient,
      getAdminClient: () =>
        buildClient({ orderUpdateError: { message: 'update failed' } })
          .client as never
    });
    await expect(
      errorStore.claimOrder({
        orderNumber: 'ATB-1',
        tokenHash: 'e'.repeat(64),
        userId: OWNER_ID,
        userEmail: 'buyer@example.test',
        nowIso: '2026-08-01T10:00:00.000Z'
      })
    ).resolves.toEqual({
      status: 'failed',
      stage: 'order_update_failed',
      orderId: 'order-1',
      orderNumber: 'ATB-1'
    });
  });
});
