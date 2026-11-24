import { describe, expect, it } from 'vitest';
import type { CartIntentLine } from '@/cart/types';
import {
  createCheckoutSession,
  type CheckoutSessionConfig,
  type CheckoutSessionPorts,
  type CheckoutSubmitPayload,
  type OrderCreatedEvent
} from '@/checkout/checkout-session';
import {
  CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY,
  CHECKOUT_EDITABLE_DRAFT_TTL_MS,
  CHECKOUT_EDITABLE_DRAFT_VERSION,
  CHECKOUT_GUEST_DRAFT_SCOPE
} from '@/checkout/editable-draft';
import { CHECKOUT_IDEMPOTENCY_STORAGE_KEY } from '@/checkout/idempotency';
import type { ShippingAddress } from '@/checkout/shipping-address';
import type { CartQuote, QuoteCartActionInput } from '@/checkout/types';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    get size() {
      return map.size;
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    }
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const usAddress: ShippingAddress = {
  recipientName: 'Taylor Customer',
  phoneNumber: '+15551234567',
  countryCode: 'US',
  region: 'CA',
  locality: 'San Francisco',
  addressLine1: '1 Market St',
  addressLine2: null,
  postalCode: '94105'
};

const vietnamAddress: ShippingAddress = {
  recipientName: 'Minh Nguyen',
  phoneNumber: '0912345678',
  countryCode: 'VN',
  region: '01',
  locality: '00004',
  addressLine1: '2 Nguyen Hue',
  addressLine2: null,
  postalCode: null
};

const physicalCartLines: CartIntentLine[] = [
  {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 1,
    marketAtAdd: 'intl',
    addedAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  }
];

function physicalQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    status: 'ready',
    locale: 'en',
    market: 'intl',
    currencyCode: 'USD',
    lines: [
      {
        lineId: 'line-1',
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: null,
        slug: 'bear',
        title: 'Bear',
        fulfillmentType: 'physical',
        status: 'ready',
        quantity: 1,
        requestedQuantity: 1,
        marketAtAdd: 'intl',
        currencyCode: 'USD',
        unitPriceMinor: 3000,
        lineSubtotalMinor: 3000,
        excludedSubtotalMinor: 0,
        variantLabel: null,
        imageUrl: null,
        categoryIds: [],
        collectionIds: [],
        discountAllocationMinor: 0,
        change: null
      }
    ],
    subtotalMinor: 3000,
    excludedSubtotalMinor: 0,
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: {
      status: 'ready',
      version: 2,
      amountMinor: 500,
      countryCode: 'US',
      regionCode: 'CA',
      firstItemLineId: 'line-1',
      chargeableUnitCount: 1,
      allocations: []
    },
    totalMinor: 3500,
    changes: [],
    hash: 'quote-a',
    quotedAt: '2026-07-12T00:00:00.000Z',
    ...overrides
  };
}

function unquotedShippingQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return physicalQuote({
    shipping: { status: 'not_calculated', amountMinor: 0 },
    totalMinor: 3000,
    hash: 'quote-unquoted',
    ...overrides
  });
}

function digitalQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  const base = physicalQuote();
  return {
    ...base,
    lines: base.lines.map((line) => ({ ...line, fulfillmentType: 'digital' })),
    shipping: { status: 'no_shipping_required', amountMinor: 0, countryCode: null },
    totalMinor: 3000,
    hash: 'quote-digital',
    ...overrides
  };
}

function mixedQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  const base = physicalQuote();
  return {
    ...base,
    lines: [
      ...base.lines,
      {
        ...base.lines[0],
        lineId: 'line-2',
        productId: '10000000-0000-4000-8000-000000000002',
        slug: 'pattern',
        title: 'Pattern',
        fulfillmentType: 'digital',
        unitPriceMinor: 1200,
        lineSubtotalMinor: 1200
      }
    ],
    subtotalMinor: 4200,
    totalMinor: 4700,
    hash: 'quote-mixed',
    ...overrides
  };
}

function createHarness(
  configOverrides: Partial<CheckoutSessionConfig> = {},
  portOverrides: Partial<CheckoutSessionPorts> = {}
) {
  const storage = createMemoryStorage();
  const quoteRequests: QuoteCartActionInput[] = [];
  const submitPayloads: CheckoutSubmitPayload[] = [];
  const createdEvents: OrderCreatedEvent[] = [];
  const callOrder: string[] = [];

  const ports: CheckoutSessionPorts = {
    getStorage: () => storage,
    mintIdempotencyKey: (hash) => `idem-${hash}`,
    refreshQuote: async (input) => {
      callOrder.push('refreshQuote');
      quoteRequests.push(input);
      return { status: 'success', quote: physicalQuote(), materialChanges: [] };
    },
    prepareGuestRecovery: async () => {
      callOrder.push('prepareGuestRecovery');
      return { status: 'ready' };
    },
    submitOrder: async (payload) => {
      callOrder.push('submitOrder');
      submitPayloads.push(payload);
      return {
        status: 'success',
        orderId: 'order-1',
        orderNumber: 'ATB-1001',
        reservationExpiresAt: '2026-08-01T00:00:00.000Z',
        orderPath: '/en/orders/ATB-1001'
      };
    },
    saveShippingAddress: async () => {
      callOrder.push('saveShippingAddress');
      return { status: 'saved' };
    },
    onOrderCreated: (event) => {
      callOrder.push('onOrderCreated');
      createdEvents.push(event);
    },
    ...portOverrides
  };

  const session = createCheckoutSession(
    {
      locale: 'en',
      draftScope: CHECKOUT_GUEST_DRAFT_SCOPE,
      isSignedIn: false,
      initialEmail: 'buyer@example.com',
      ...configOverrides
    },
    ports
  );

  return {
    session,
    storage,
    quoteRequests,
    submitPayloads,
    createdEvents,
    callOrder
  };
}

describe('CheckoutSession prefill & Destination Authority', () => {
  it('prefers saved destination, then quoted destination, then VN market default, and leaves intl empty', async () => {
    const saved = createHarness(
      { savedShippingAddress: usAddress },
      {
        refreshQuote: async (input) => {
          saved.quoteRequests.push(input);
          return { status: 'success', quote: physicalQuote({ market: 'intl' }), materialChanges: [] };
        }
      }
    );
    saved.session.hydrateDraft();
    saved.session.syncCart({
      quote: unquotedShippingQuote({ market: 'vn', currencyCode: 'VND' }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    await Promise.resolve();
    expect(saved.quoteRequests[0]).toMatchObject({
      destinationCountryCode: 'US',
      destinationRegionCode: 'CA'
    });
    expect(saved.session.getSnapshot().proposal).toBeNull();
    expect(saved.storage.size).toBe(0);

    const quoted = createHarness();
    quoted.session.hydrateDraft();
    quoted.session.syncCart({
      quote: physicalQuote({
        market: 'vn',
        shipping: {
          status: 'ready',
          version: 2,
          amountMinor: 0,
          countryCode: 'AU',
          regionCode: null,
          firstItemLineId: 'line-1',
          chargeableUnitCount: 1,
          allocations: []
        }
      }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    expect(quoted.session.getSnapshot().destinationStatus.destination).toEqual({
      countryCode: 'AU',
      regionCode: null
    });
    expect(quoted.quoteRequests).toHaveLength(0);

    const vnDefault = createHarness();
    vnDefault.session.hydrateDraft();
    vnDefault.session.syncCart({
      quote: unquotedShippingQuote({ market: 'vn', currencyCode: 'VND' }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    await Promise.resolve();
    expect(vnDefault.quoteRequests[0]).toMatchObject({
      destinationCountryCode: 'VN',
      destinationRegionCode: null
    });
    expect(vnDefault.storage.size).toBe(0);

    const intlDefault = createHarness();
    intlDefault.session.hydrateDraft();
    intlDefault.session.syncCart({
      quote: unquotedShippingQuote({ market: 'intl', currencyCode: 'USD' }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    expect(intlDefault.session.getSnapshot().destinationStatus.destination).toEqual({
      countryCode: null,
      regionCode: null
    });
    expect(intlDefault.quoteRequests).toHaveLength(0);
  });

  it('deduplicates repeated prefill requotes for identical quote hashes and destinations', async () => {
    const vnDefault = createHarness();
    vnDefault.session.hydrateDraft();
    const initial = unquotedShippingQuote({ market: 'vn', currencyCode: 'VND', hash: 'dup-hash' });
    vnDefault.session.syncCart({
      quote: initial,
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    await Promise.resolve();
    expect(vnDefault.quoteRequests).toHaveLength(1);
  });

  it('preserves Destination Authority across upstream updates for physical intent even when quantity is zero, and drops it for digital-only carts', async () => {
    const { session, quoteRequests } = createHarness();
    session.hydrateDraft();
    session.syncCart({
      quote: unquotedShippingQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    await session.changeDestination({ countryCode: 'VN', regionCode: null });
    expect(quoteRequests).toHaveLength(1);

    // Physical line unavailable at current market (`quantity: 0`), but `requestedQuantity: 1`
    // keeps Destination Authority active across upstream updates.
    const unavailablePhysicalUpstream = physicalQuote({
      status: 'blocked',
      hash: 'upstream-blocked',
      lines: [
        {
          ...physicalQuote().lines[0],
          status: 'unavailable',
          quantity: 0,
          requestedQuantity: 1
        }
      ],
      shipping: { status: 'not_calculated', amountMinor: 0 }
    });
    session.syncCart({
      quote: unavailablePhysicalUpstream,
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    await Promise.resolve();
    expect(quoteRequests).toHaveLength(2);
    expect(quoteRequests[1]).toMatchObject({
      destinationCountryCode: 'VN',
      destinationRegionCode: null
    });

    // Switching to digital-only cart releases Destination Authority without firing upstream requote.
    session.syncCart({
      quote: digitalQuote({ hash: 'upstream-digital' }),
      lines: [{ ...physicalCartLines[0], productId: '10000000-0000-4000-8000-000000000009' }],
      hasCart: true,
      pending: false
    });
    await Promise.resolve();
    expect(quoteRequests).toHaveLength(2);
    expect(session.getSnapshot().destinationStatus.destination).toEqual({
      countryCode: null,
      regionCode: null
    });
  });
});

describe('CheckoutSession Editable Draft & saved addresses', () => {
  it('hydrates Editable Draft before reconciling upstream quote and saves only on customer edits', async () => {
    const { session, storage, quoteRequests } = createHarness();
    const now = Date.now();
    storage.setItem(
      CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: CHECKOUT_EDITABLE_DRAFT_VERSION,
        scope: CHECKOUT_GUEST_DRAFT_SCOPE,
        savedAt: now,
        expiresAt: now + CHECKOUT_EDITABLE_DRAFT_TTL_MS,
        email: 'draft@example.com',
        shippingAddress: { ...usAddress, region: 'NY' }
      })
    );

    session.syncCart({
      quote: unquotedShippingQuote({ hash: 'initial-upstream' }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    // Upstream sync must wait until draft hydration runs.
    expect(quoteRequests).toHaveLength(0);

    session.hydrateDraft();
    await Promise.resolve();
    expect(session.getSnapshot()).toMatchObject({
      draftHydrated: true,
      email: 'draft@example.com',
      destinationExpanded: true
    });
    expect(quoteRequests).toHaveLength(1);
    expect(quoteRequests[0]).toMatchObject({
      destinationCountryCode: 'US',
      destinationRegionCode: 'NY'
    });

    session.setEmail('edited@example.com');
    const savedRaw = storage.getItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
    expect(savedRaw).toContain('edited@example.com');
  });

  it('applies a saved address, collapses destination, preserves non-US region in address while excluding it from resolver intent', async () => {
    const { session, quoteRequests, storage } = createHarness({
      savedShippingAddress: usAddress
    });
    session.hydrateDraft();
    const q = physicalQuote({
      discount: {
        status: 'applied',
        code: 'SAVE10',
        amountMinor: 300,
        allocations: [{ lineId: 'line-1', amountMinor: 300 }]
      },
      lines: [
        {
          ...physicalQuote().lines[0],
          requestedQuantity: 2
        }
      ],
      hash: 'accepted-hash'
    });
    session.syncCart({ quote: q, lines: physicalCartLines, hasCart: true, pending: false });

    const nonUsSaved: ShippingAddress = {
      ...vietnamAddress,
      region: 'Ho Chi Minh City'
    };
    await session.applySavedAddress(nonUsSaved);

    expect(session.getSnapshot()).toMatchObject({
      destinationExpanded: false,
      shippingAddress: nonUsSaved
    });
    expect(quoteRequests[0]).toMatchObject({
      destinationCountryCode: 'VN',
      destinationRegionCode: null,
      discountCode: 'SAVE10',
      priorAcceptedQuoteHash: 'accepted-hash'
    });
    expect(quoteRequests[0]?.lines).toEqual([
      expect.objectContaining({
        productId: q.lines[0].productId,
        quantity: 2,
        marketAtAdd: 'intl'
      })
    ]);
    expect(quoteRequests[0]).not.toHaveProperty('acceptedQuote');
    expect(quoteRequests[0]).not.toHaveProperty('shippingAddress');
    expect(storage.getItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY)).toContain('Ho Chi Minh City');
  });
});

describe('CheckoutSession quote diffing, shipping notices & concurrency', () => {
  it('auto-accepts destination shipping fee updates with calculated/updated notice and zero proposal', async () => {
    let stage = 0;
    const { session } = createHarness(
      {},
      {
        refreshQuote: async () => {
          stage += 1;
          if (stage === 1) {
            return { status: 'success', quote: physicalQuote({ hash: 'calc-1' }), materialChanges: [] };
          }
          if (stage === 2) {
            return {
              status: 'success',
              quote: physicalQuote({
                hash: 'calc-2',
                shipping: {
                  status: 'ready',
                  version: 2,
                  amountMinor: 900,
                  countryCode: 'US',
                  regionCode: 'NY',
                  firstItemLineId: 'line-1',
                  chargeableUnitCount: 1,
                  allocations: []
                },
                totalMinor: 3900
              }),
              materialChanges: []
            };
          }
          return {
            status: 'success',
            quote: physicalQuote({
              hash: 'calc-3',
              shipping: {
                status: 'ready',
                version: 2,
                amountMinor: 900,
                countryCode: 'US',
                regionCode: 'TX',
                firstItemLineId: 'line-1',
                chargeableUnitCount: 1,
                allocations: []
              },
              totalMinor: 3900
            }),
            materialChanges: []
          };
        }
      }
    );

    session.hydrateDraft();
    session.syncCart({
      quote: unquotedShippingQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    await session.changeDestination({ countryCode: 'US', regionCode: 'CA' });
    expect(session.getSnapshot().proposal).toBeNull();
    expect(session.getSnapshot().shippingNotice).toEqual({
      notice: { kind: 'calculated', previousAmountMinor: null, currentAmountMinor: 500 },
      currencyCode: 'USD'
    });

    await session.changeDestination({ countryCode: 'US', regionCode: 'NY' });
    expect(session.getSnapshot().proposal).toBeNull();
    expect(session.getSnapshot().shippingNotice).toEqual({
      notice: { kind: 'updated', previousAmountMinor: 500, currentAmountMinor: 900 },
      currencyCode: 'USD'
    });

    await session.changeDestination({ countryCode: 'US', regionCode: 'TX' });
    expect(session.getSnapshot().shippingNotice).toBeNull();
  });

  it('raises a Proposal when destination edit switches market/currency or moves line price/availability', async () => {
    const vnSwitched = physicalQuote({
      market: 'vn',
      currencyCode: 'VND',
      subtotalMinor: 750000,
      totalMinor: 800000,
      hash: 'vn-quote',
      shipping: {
        status: 'ready',
        version: 2,
        amountMinor: 50000,
        countryCode: 'VN',
        firstItemLineId: 'line-1',
        chargeableUnitCount: 1,
        allocations: []
      }
    });
    const { session } = createHarness(
      {},
      {
        refreshQuote: async () => ({ status: 'success', quote: vnSwitched, materialChanges: [] })
      }
    );
    session.hydrateDraft();
    session.syncCart({
      quote: physicalQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    await session.changeDestination({ countryCode: 'VN', regionCode: null });
    expect(session.getSnapshot().proposal?.quote.hash).toBe('vn-quote');
    expect(session.getSnapshot().proposal?.materialChanges.map((c) => c.type)).toEqual(
      expect.arrayContaining(['market_changed', 'currency_changed'])
    );
  });

  it('applies/removes discounts without a Proposal, yet catches simultaneous hidden price increases', async () => {
    const base = physicalQuote();
    const withDiscount = (q: CartQuote, amountMinor: number): CartQuote => ({
      ...q,
      discount: {
        status: 'applied',
        code: 'SAVE3',
        amountMinor,
        allocations: [{ lineId: 'line-1', amountMinor }]
      },
      lines: q.lines.map((line) => ({ ...line, discountAllocationMinor: amountMinor })),
      totalMinor: q.totalMinor - amountMinor,
      hash: `${q.hash}-disc-${amountMinor}`
    });

    let nextQuote: CartQuote = withDiscount(base, 300);
    const { session } = createHarness(
      {},
      {
        refreshQuote: async () => ({ status: 'success', quote: nextQuote, materialChanges: [] })
      }
    );
    session.hydrateDraft();
    session.syncCart({ quote: base, lines: physicalCartLines, hasCart: true, pending: false });

    const applied = await session.applyDiscount('SAVE3');
    expect(applied).toEqual({ status: 'applied', quoteHash: nextQuote.hash });
    expect(session.getSnapshot().proposal).toBeNull();
    expect(session.getSnapshot().acceptedQuote?.totalMinor).toBe(3200);

    // Removing discount alone also skips modal.
    nextQuote = base;
    const removed = await session.applyDiscount(null);
    expect(removed).toEqual({ status: 'applied', quoteHash: base.hash });
    expect(session.getSnapshot().proposal).toBeNull();

    // Price rise of +300 cancelled out by a 300 discount keeps totalMinor=3500, but MUST gate.
    const hiddenPriceRise: CartQuote = withDiscount(
      {
        ...base,
        lines: base.lines.map((line) => ({
          ...line,
          unitPriceMinor: 3300,
          lineSubtotalMinor: 3300
        })),
        subtotalMinor: 3300,
        totalMinor: 3800
      },
      300
    );
    expect(hiddenPriceRise.totalMinor).toBe(base.totalMinor);
    nextQuote = hiddenPriceRise;
    const gated = await session.applyDiscount('SAVE3');
    expect(gated).toEqual({ status: 'applied', quoteHash: hiddenPriceRise.hash });
    expect(session.getSnapshot().proposal).not.toBeNull();
  });

  it('drops out-of-order stale quote responses without clobbering acceptedQuote or shippingNotice', async () => {
    const first = createDeferred<Awaited<ReturnType<CheckoutSessionPorts['refreshQuote']>>>();
    const second = createDeferred<Awaited<ReturnType<CheckoutSessionPorts['refreshQuote']>>>();
    let count = 0;

    const { session } = createHarness(
      {},
      {
        refreshQuote: () => {
          count += 1;
          return count === 1 ? first.promise : second.promise;
        }
      }
    );

    session.hydrateDraft();
    session.syncCart({
      quote: unquotedShippingQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    const p1 = session.changeDestination({ countryCode: 'US', regionCode: 'CA' });
    const p2 = session.changeDestination({ countryCode: 'US', regionCode: 'NY' });

    second.resolve({
      status: 'success',
      quote: physicalQuote({
        hash: 'ny-quote',
        shipping: {
          status: 'ready',
          version: 2,
          amountMinor: 800,
          countryCode: 'US',
          regionCode: 'NY',
          firstItemLineId: 'line-1',
          chargeableUnitCount: 1,
          allocations: []
        },
        totalMinor: 3800
      }),
      materialChanges: []
    });
    await p2;

    expect(session.getSnapshot().acceptedQuote?.hash).toBe('ny-quote');
    expect(session.getSnapshot().shippingNotice?.notice.currentAmountMinor).toBe(800);

    // Late rejection/resolution from superseded request 1 must have zero effect.
    first.reject(new Error('late timeout'));
    await p1;

    expect(session.getSnapshot().acceptedQuote?.hash).toBe('ny-quote');
    expect(session.getSnapshot().destinationStatus.issue).toBeNull();
    expect(session.getSnapshot().shippingNotice?.notice.currentAmountMinor).toBe(800);
  });

  it('records quote issues for unsupported, network, and server errors while supporting retryQuote', async () => {
    let attempt = 0;
    const unsupportedQuote = physicalQuote({
      status: 'blocked',
      shipping: {
        status: 'unsupported_destination',
        version: 2,
        amountMinor: null,
        countryCode: 'AQ',
        unsupportedLineIds: ['line-1'],
        failureCode: 'no_profile'
      }
    });

    const { session } = createHarness(
      {},
      {
        refreshQuote: async () => {
          attempt += 1;
          if (attempt === 1) return { status: 'success', quote: unsupportedQuote, materialChanges: [] };
          if (attempt === 2) return { status: 'error', code: 'checkout_quote_failed' };
          if (attempt === 3) return { status: 'invalid', code: 'invalid_checkout_quote' };
          return { status: 'success', quote: physicalQuote({ hash: 'recovered' }), materialChanges: [] };
        }
      }
    );

    session.hydrateDraft();
    session.syncCart({
      quote: physicalQuote({ hash: 'initial' }),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    await session.changeDestination({ countryCode: 'AQ', regionCode: null });
    expect(session.getSnapshot().destinationStatus.issue).toEqual({
      kind: 'unsupported',
      code: 'no_profile'
    });
    expect(session.getSnapshot().acceptedQuote?.hash).toBe('initial');

    await session.changeDestination({ countryCode: 'US', regionCode: 'CA' });
    expect(session.getSnapshot().destinationStatus.issue?.kind).toBe('network');

    await session.retryQuote();
    expect(session.getSnapshot().destinationStatus.issue?.kind).toBe('server');

    await session.retryQuote();
    expect(session.getSnapshot().destinationStatus.issue).toBeNull();
    expect(session.getSnapshot().acceptedQuote?.hash).toBe('recovered');
  });

  it('settles superseded or disposed applyDiscount promises cleanly without calling onOrderCreated', async () => {
    const discountDeferred = createDeferred<Awaited<ReturnType<CheckoutSessionPorts['refreshQuote']>>>();
    const { session, createdEvents } = createHarness(
      {},
      {
        refreshQuote: () => discountDeferred.promise
      }
    );
    session.hydrateDraft();
    session.syncCart({
      quote: physicalQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    const discountPromise = session.applyDiscount('LATE');
    session.dispose();
    const outcome = await discountPromise;

    discountDeferred.resolve({ status: 'success', quote: physicalQuote(), materialChanges: [] });
    await Promise.resolve();

    expect(outcome).toEqual({ status: 'failed', quoteHash: null });
    expect(createdEvents).toHaveLength(0);
  });
});

describe('CheckoutSession submit & ASVS L1 invariants', () => {
  it('validates incomplete contact/destination before calling server and expands destination when missing', async () => {
    const { session, quoteRequests, submitPayloads } = createHarness({
      initialEmail: ''
    });
    session.hydrateDraft();
    session.syncCart({
      quote: physicalQuote(),
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });

    const missingContact = await session.submit();
    expect(missingContact).toEqual({ status: 'invalid', focusTarget: 'contact' });
    expect(quoteRequests).toHaveLength(0);

    session.setEmail('buyer@example.com');
    session.setContactReady(true);
    session.setDestinationExpanded(false);

    const missingDest = await session.submit();
    expect(missingDest).toEqual({ status: 'invalid', focusTarget: 'destination' });
    expect(session.getSnapshot().destinationExpanded).toBe(true);
    expect(submitPayloads).toHaveLength(0);
  });

  it('pauses on submit-time Proposal without preparing Guest Recovery or submitting, resumes only on explicit accept, and disarms on reject', async () => {
    const initial = mixedQuote({ hash: 'initial-mixed' });
    const repriced = mixedQuote({
      hash: 'repriced-mixed',
      lines: mixedQuote().lines.map((line, index) =>
        index === 0 ? { ...line, unitPriceMinor: 3500, lineSubtotalMinor: 3500 } : line
      ),
      subtotalMinor: 4700,
      totalMinor: 5200
    });

    const { session, callOrder, submitPayloads, createdEvents, storage } = createHarness(
      { savedShippingAddress: usAddress },
      {
        refreshQuote: async () => {
          callOrder.push('refreshQuote');
          return { status: 'success', quote: repriced, materialChanges: [] };
        }
      }
    );
    session.hydrateDraft();
    session.syncCart({ quote: initial, lines: physicalCartLines, hasCart: true, pending: false });
    session.setContactReady(true);

    // Reject path: cancel must disarm resumeSubmitAfterReview and restore accepted destination.
    const paused1 = await session.submit();
    expect(paused1).toEqual({ status: 'needs_review' });
    expect(session.getSnapshot().submitStage).toBe('idle');
    expect(callOrder).toEqual(['refreshQuote']);

    session.rejectProposal();
    expect(session.getSnapshot().proposal).toBeNull();
    expect(session.getSnapshot().destinationExpanded).toBe(true);
    const noopResume = await session.acceptProposalAndResume();
    expect(noopResume).toEqual({ status: 'accepted' });
    expect(submitPayloads).toHaveLength(0);

    // Accept-and-resume path: runs Guest Recovery strictly between accepted Quote and submitOrder.
    const paused2 = await session.submit();
    expect(paused2).toEqual({ status: 'needs_review' });
    const resumed = await session.acceptProposalAndResume();

    expect(resumed).toMatchObject({
      status: 'submitted',
      orderNumber: 'ATB-1001',
      completedLines: [
        { productId: '10000000-0000-4000-8000-000000000001', variantId: null, quantity: 1 },
        { productId: '10000000-0000-4000-8000-000000000002', variantId: null, quantity: 1 }
      ]
    });
    expect(callOrder).toEqual([
      'refreshQuote',
      'refreshQuote',
      'prepareGuestRecovery',
      'submitOrder',
      'onOrderCreated'
    ]);
    expect(submitPayloads[0]?.acceptedQuoteHash).toBe('repriced-mixed');
    expect(createdEvents).toHaveLength(1);
    expect(storage.getItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY)).toBeNull();
  });

  it('prevents concurrent double submit via single-flight lock', async () => {
    const refreshDeferred = createDeferred<Awaited<ReturnType<CheckoutSessionPorts['refreshQuote']>>>();
    const q = digitalQuote({ hash: 'digital-1' });
    const { session, submitPayloads } = createHarness(
      {},
      {
        refreshQuote: () => refreshDeferred.promise
      }
    );
    session.hydrateDraft();
    session.syncCart({ quote: q, lines: physicalCartLines, hasCart: true, pending: false });
    session.setContactReady(true);

    const first = session.submit();
    expect(session.getSnapshot().submitStage).toBe('checking-total');
    const second = await session.submit();
    expect(second).toEqual({ status: 'ignored' });

    refreshDeferred.resolve({ status: 'success', quote: q, materialChanges: [] });
    const outcome = await first;
    expect(outcome.status).toBe('submitted');
    expect(submitPayloads).toHaveLength(1);
  });

  it('aborts before submitOrder when prepareGuestRecovery fails', async () => {
    const q = digitalQuote({ hash: 'digital-1' });
    const { session, submitPayloads } = createHarness(
      {},
      {
        refreshQuote: async () => ({ status: 'success', quote: q, materialChanges: [] }),
        prepareGuestRecovery: async () => ({ status: 'invalid', code: 'guest_recovery_required' })
      }
    );
    session.hydrateDraft();
    session.syncCart({ quote: q, lines: physicalCartLines, hasCart: true, pending: false });
    session.setContactReady(true);

    const outcome = await session.submit();
    expect(outcome).toMatchObject({
      status: 'failed',
      result: { status: 'invalid', code: 'guest_recovery_required' },
      focusTarget: 'contact'
    });
    expect(submitPayloads).toHaveLength(0);
    expect(session.getSnapshot().submitError?.messageKey).toBe('cookiesBlocked');
  });

  it('tracks dedupeGuaranteed truthfully when storage is blocked for signed-in vs guest checkout', async () => {
    const q = digitalQuote({ hash: 'digital-1' });
    const signedInBlocked = createHarness(
      { isSignedIn: true },
      {
        getStorage: () => null,
        refreshQuote: async () => ({ status: 'success', quote: q, materialChanges: [] }),
        submitOrder: async () => ({ status: 'error', code: 'checkout_submit_failed' })
      }
    );
    signedInBlocked.session.hydrateDraft();
    signedInBlocked.session.syncCart({ quote: q, lines: physicalCartLines, hasCart: true, pending: false });
    signedInBlocked.session.setContactReady(true);

    await signedInBlocked.session.submit();
    expect(signedInBlocked.session.getSnapshot().dedupeGuaranteed).toBe(false);
    expect(signedInBlocked.session.getSnapshot().submitError).toMatchObject({
      messageKey: 'networkUnconfirmed',
      outcome: 'unknown',
      retryAllowed: false
    });

    const guestBlocked = createHarness(
      { isSignedIn: false },
      {
        getStorage: () => null,
        refreshQuote: async () => ({ status: 'success', quote: q, materialChanges: [] }),
        submitOrder: async () => ({ status: 'error', code: 'checkout_submit_failed' })
      }
    );
    guestBlocked.session.hydrateDraft();
    guestBlocked.session.syncCart({ quote: q, lines: physicalCartLines, hasCart: true, pending: false });
    guestBlocked.session.setContactReady(true);

    await guestBlocked.session.submit();
    expect(guestBlocked.session.getSnapshot().dedupeGuaranteed).toBe(true);
    expect(guestBlocked.session.getSnapshot().submitError).toMatchObject({
      messageKey: 'network',
      outcome: 'known',
      retryAllowed: true
    });
  });

  it('computes completedLines from final line.quantity only and sets addressSaveWarning without failing order on save error', async () => {
    const cappedQuote = physicalQuote({
      hash: 'capped-quote',
      lines: [
        {
          ...physicalQuote().lines[0],
          status: 'quantity_capped',
          quantity: 2,
          requestedQuantity: 5
        },
        {
          ...physicalQuote().lines[0],
          lineId: 'line-blocked',
          productId: '10000000-0000-4000-8000-000000000099',
          status: 'unavailable',
          quantity: 0,
          requestedQuantity: 3
        }
      ]
    });

    const { session, createdEvents, submitPayloads } = createHarness(
      { isSignedIn: true, savedShippingAddress: usAddress },
      {
        refreshQuote: async () => ({ status: 'success', quote: cappedQuote, materialChanges: [] }),
        saveShippingAddress: async () => {
          throw new Error('save failed');
        }
      }
    );
    session.hydrateDraft();
    session.syncCart({
      quote: cappedQuote,
      lines: physicalCartLines,
      hasCart: true,
      pending: false
    });
    session.setContactReady(true);
    session.setSaveAddress(true);

    const outcome = await session.submit();
    expect(outcome.status).toBe('submitted');
    expect(session.getSnapshot().addressSaveWarning).toBe(true);
    expect(submitPayloads[0]?.lines).toEqual([
      expect.objectContaining({ quantity: 5 }),
      expect.objectContaining({ quantity: 3 })
    ]);
    expect(createdEvents[0]?.completedLines).toEqual([
      { productId: '10000000-0000-4000-8000-000000000001', variantId: null, quantity: 2 }
    ]);
  });
});
