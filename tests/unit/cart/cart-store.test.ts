import { describe, expect, it, vi } from 'vitest';
import type { CartQuoteActionState } from '@/cart/actions';
import {
  CART_UNDO_WINDOW_MS,
  createCartStore,
  subtractCompletedOrderLines,
  type CartContextSnapshot,
  type CartStoreTimer,
  type CompletedOrderLine
} from '@/cart/cart-store';
import { readGuestCart, writeGuestCart } from '@/cart/guest-storage';
import { readOrderSnapshot } from '@/cart/order-snapshot';
import { readCartQuoteCache, writeCartQuoteCache } from '@/cart/quote-cache';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuote } from '@/checkout/types';

const PRODUCT_A = '10000000-0000-4000-8000-000000000001';
const PRODUCT_B = '10000000-0000-4000-8000-000000000002';
const ADDED_AT = '2026-07-27T00:00:00.000Z';
const COMPLETED_AT = '2026-07-27T00:10:00.000Z';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

function makeIntentLine(overrides: Partial<CartIntentLine> = {}): CartIntentLine {
  return {
    productId: PRODUCT_A,
    variantId: null,
    quantity: 1,
    marketAtAdd: 'vn',
    addedAt: ADDED_AT,
    updatedAt: ADDED_AT,
    ...overrides
  };
}

function makeCompletedLine(
  overrides: Partial<CompletedOrderLine> = {}
): CompletedOrderLine {
  return {
    productId: PRODUCT_A,
    variantId: null,
    quantity: 1,
    ...overrides
  };
}

function makeQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  const market = overrides.market ?? 'vn';
  const locale = overrides.locale ?? (market === 'vn' ? 'vi' : 'en');
  return {
    status: overrides.lines?.length === 0 ? 'empty' : 'ready',
    locale,
    market,
    currencyCode: market === 'vn' ? 'VND' : 'USD',
    lines: [],
    subtotalMinor: market === 'vn' ? 120_000 : 1200,
    excludedSubtotalMinor: 0,
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: {
      status: 'no_shipping_required',
      amountMinor: 0,
      countryCode: null
    },
    totalMinor: market === 'vn' ? 120_000 : 1200,
    changes: [],
    hash: `quote-${market}-${locale}`,
    quotedAt: COMPLETED_AT,
    ...overrides
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFakeTimers() {
  let nextId = 1;
  const tasks = new Map<number, { callback: () => void; delayMs: number }>();
  const clearedIds: number[] = [];

  return {
    tasks,
    clearedIds,
    scheduleTimer(callback: () => void, delayMs: number): CartStoreTimer {
      const id = nextId++;
      tasks.set(id, { callback, delayMs });
      return id as unknown as CartStoreTimer;
    },
    clearTimer(timer: CartStoreTimer) {
      const id = timer as unknown as number;
      if (tasks.delete(id)) {
        clearedIds.push(id);
      }
    },
    flushAll() {
      const pending = Array.from(tasks.entries());
      tasks.clear();
      for (const [, entry] of pending) {
        entry.callback();
      }
    }
  };
}

describe('completed order cart reconciliation', () => {
  it('removes an exact ordered line and preserves unrelated lines', () => {
    const unrelated = makeIntentLine({ productId: PRODUCT_B, quantity: 3 });

    expect(
      subtractCompletedOrderLines({
        currentLines: [makeIntentLine(), unrelated],
        completedLines: [makeCompletedLine()],
        updatedAt: COMPLETED_AT
      })
    ).toEqual([unrelated]);
  });

  it('preserves the surplus that was capped out of the order', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [makeIntentLine({ quantity: 2 })],
        completedLines: [makeCompletedLine({ quantity: 1 })],
        updatedAt: COMPLETED_AT
      })
    ).toEqual([
      expect.objectContaining({
        quantity: 1,
        addedAt: ADDED_AT,
        updatedAt: COMPLETED_AT
      })
    ]);
  });

  it('preserves quantities added in another tab after checkout started', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [makeIntentLine({ quantity: 4 })],
        completedLines: [makeCompletedLine({ quantity: 2 })],
        updatedAt: COMPLETED_AT
      })
    ).toEqual([expect.objectContaining({ quantity: 2, updatedAt: COMPLETED_AT })]);
  });

  it('aggregates duplicate completed lines before subtraction', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [makeIntentLine({ quantity: 5 })],
        completedLines: [
          makeCompletedLine({ quantity: 1 }),
          makeCompletedLine({ quantity: 2 })
        ],
        updatedAt: COMPLETED_AT
      })
    ).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('ignores invalid and non-matching completion evidence', () => {
    const current = makeIntentLine({ quantity: 2 });

    expect(
      subtractCompletedOrderLines({
        currentLines: [current],
        completedLines: [
          makeCompletedLine({ quantity: 0 }),
          makeCompletedLine({ productId: PRODUCT_B, quantity: 1 })
        ],
        updatedAt: COMPLETED_AT
      })
    ).toEqual([current]);
  });
});

describe('createCartStore', () => {
  const vnReady: CartContextSnapshot = {
    locale: 'vi',
    status: 'ready',
    market: 'vn',
    contextVersion: 1
  };

  it('keeps server snapshot pre-hydrated and reuses valid quote cache on initial ready hydration', () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const nowDate = new Date('2026-07-27T01:00:00.000Z');
    const saved = writeGuestCart(
      { lines: [makeIntentLine({ quantity: 2 })] },
      { storage: localStorage, now: nowDate }
    );
    const cachedQuote = makeQuote({ market: 'vn', locale: 'vi', subtotalMinor: 240_000 });
    writeCartQuoteCache({
      locale: 'vi',
      market: 'vn',
      contextVersion: 1,
      lines: saved.lines,
      quote: cachedQuote,
      storage: sessionStorage,
      now: nowDate.getTime()
    });
    const fetchQuote = vi.fn<
      (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
    >();

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage,
      now: () => nowDate
    });

    expect(store.getSnapshot()).toBe(store.getServerSnapshot());
    expect(store.getServerSnapshot()).toMatchObject({
      hydrated: false,
      count: 0,
      pending: true,
      quote: null
    });

    const snapshots: number[] = [];
    store.subscribe(() => snapshots.push(store.getSnapshot().count));
    store.hydrate();

    expect(fetchQuote).not.toHaveBeenCalled();
    expect(snapshots).toEqual([2, 2]);
    expect(store.getSnapshot()).toMatchObject({
      hydrated: true,
      count: 2,
      pending: false,
      syncStatus: 'ready',
      blockReason: null,
      quote: cachedQuote
    });
  });

  it('synchronously reconciles placed order in RAM and storage and drops pre-order in-flight quotes', async () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const timers = createFakeTimers();
    let clock = new Date('2026-07-27T01:00:00.000Z');
    const firstLine = makeIntentLine({ productId: PRODUCT_A, quantity: 2 });
    const secondLine = makeIntentLine({ productId: PRODUCT_B, quantity: 1 });
    writeGuestCart({ lines: [firstLine, secondLine] }, { storage: localStorage, now: clock });

    const initialQuoteFetch = deferred<CartQuoteActionState>();
    const inflightMutateFetch = deferred<CartQuoteActionState>();
    const postOrderFetch = deferred<CartQuoteActionState>();
    const fetchQuote = vi
      .fn<
        (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
      >()
      .mockReturnValueOnce(initialQuoteFetch.promise)
      .mockReturnValueOnce(inflightMutateFetch.promise)
      .mockReturnValueOnce(postOrderFetch.promise);

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage,
      now: () => clock,
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer
    });

    store.hydrate();
    initialQuoteFetch.resolve({
      status: 'success',
      quote: makeQuote({ market: 'vn', locale: 'vi', subtotalMinor: 300_000 })
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getSnapshot().quote?.subtotalMinor).toBe(300_000);
    expect(store.getSnapshot().count).toBe(3);

    // Start an in-flight mutation requote and a pending undo removal before order completion.
    store.removeLine(secondLine);
    expect(store.getSnapshot().removedLine).toEqual(secondLine);
    expect(timers.tasks.size).toBe(1);

    clock = new Date('2026-07-27T01:02:00.000Z');
    store.commitPlacedOrder({
      orderNumber: 'atb-order-9',
      completedLines: [{ productId: PRODUCT_A, variantId: null, quantity: 2 }]
    });

    // Synchronous RAM state immediately reflects the completed order (no stale mini-cart count/quote).
    expect(store.getSnapshot().count).toBe(0);
    expect(store.getSnapshot().cart?.lines).toEqual([]);
    expect(store.getSnapshot().quote).toBeNull();
    expect(store.getSnapshot().removedLine).toBeNull();
    expect(timers.clearedIds).toHaveLength(1);
    expect(readGuestCart({ storage: localStorage, now: clock })?.lines).toEqual([]);
    expect(
      readOrderSnapshot('ATB-ORDER-9', { storage: localStorage, now: clock })?.lines
    ).toEqual([{ ...firstLine, quantity: 2 }]);

    // Even if an older pre-order quote resolves afterward, it must not resurrect old pricing.
    inflightMutateFetch.resolve({
      status: 'success',
      quote: makeQuote({ market: 'vn', locale: 'vi', subtotalMinor: 999_000 })
    });
    await Promise.resolve();
    expect(store.getSnapshot().quote).toBeNull();

    // Post-order empty quote settles cleanly.
    postOrderFetch.resolve({
      status: 'success',
      quote: makeQuote({ market: 'vn', locale: 'vi', lines: [], subtotalMinor: 0, totalMinor: 0 })
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(store.getSnapshot().quote?.status).toBe('empty');
    expect(store.getSnapshot().count).toBe(0);
  });

  it('preserves remaining cart quantity in RAM and storage on partial commitPlacedOrder', async () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const clock = new Date('2026-07-27T01:00:00.000Z');
    const keptLine = makeIntentLine({ productId: PRODUCT_A, quantity: 3 });
    const otherLine = makeIntentLine({ productId: PRODUCT_B, quantity: 1 });
    writeGuestCart({ lines: [keptLine, otherLine] }, { storage: localStorage, now: clock });

    const fetchQuote = vi
      .fn<
        (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
      >()
      .mockResolvedValue({ status: 'success', quote: makeQuote({ market: 'vn', locale: 'vi' }) });

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage,
      now: () => clock
    });

    store.hydrate();
    await Promise.resolve();
    await Promise.resolve();

    store.commitPlacedOrder({
      orderNumber: 'ATB-PARTIAL-1',
      completedLines: [{ productId: PRODUCT_A, variantId: null, quantity: 1 }]
    });

    expect(store.getSnapshot().count).toBe(3);
    expect(store.getSnapshot().cart?.lines).toEqual([
      expect.objectContaining({ productId: PRODUCT_A, quantity: 2 }),
      otherLine
    ]);
    expect(
      readOrderSnapshot('ATB-PARTIAL-1', { storage: localStorage, now: clock })?.lines
    ).toEqual([{ ...keptLine, quantity: 1 }]);
    expect(fetchQuote).toHaveBeenLastCalledWith({
      locale: 'vi',
      lines: [
        expect.objectContaining({ productId: PRODUCT_A, quantity: 2 }),
        otherLine
      ]
    });
  });

  it('guards against stale market responses and forwards only locale + lines to fetchQuote', async () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const clock = new Date('2026-07-27T01:00:00.000Z');
    writeGuestCart({ lines: [makeIntentLine()] }, { storage: localStorage, now: clock });

    const vnFirst = deferred<CartQuoteActionState>();
    const intlSecond = deferred<CartQuoteActionState>();
    const fetchQuote = vi
      .fn<
        (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
      >()
      .mockReturnValueOnce(vnFirst.promise)
      .mockReturnValueOnce(intlSecond.promise);

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage,
      now: () => clock
    });

    store.hydrate();
    store.syncContext({
      locale: 'en',
      status: 'ready',
      market: 'intl',
      contextVersion: 2
    });

    expect(fetchQuote).toHaveBeenNthCalledWith(1, {
      locale: 'vi',
      lines: [makeIntentLine()]
    });
    expect(fetchQuote).toHaveBeenNthCalledWith(2, {
      locale: 'en',
      lines: [makeIntentLine()]
    });

    // Out-of-order first VN response resolves after INTL context switch -> ignored.
    vnFirst.resolve({ status: 'success', quote: makeQuote({ market: 'vn', locale: 'vi' }) });
    await Promise.resolve();
    expect(store.getSnapshot().quote).toBeNull();
    expect(store.getSnapshot().blockReason).toBe('requote_updating');

    const intlQuote = makeQuote({ market: 'intl', locale: 'en', totalMinor: 1500 });
    intlSecond.resolve({ status: 'success', quote: intlQuote });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getSnapshot().quote).toEqual(intlQuote);
    expect(store.getSnapshot().blockReason).toBeNull();
    expect(
      readCartQuoteCache({
        locale: 'en',
        market: 'intl',
        contextVersion: 2,
        lines: [makeIntentLine()],
        storage: sessionStorage,
        now: clock.getTime()
      })
    ).toEqual(intlQuote);
  });

  it('supports addLine, quantity clamping, removeLine undo window, restoreOrderSnapshot, retry, and dispose', async () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const timers = createFakeTimers();
    const retryContext = vi.fn(async () => undefined);
    const clock = new Date('2026-07-27T01:00:00.000Z');
    const fetchQuote = vi
      .fn<
        (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
      >()
      .mockResolvedValue({ status: 'success', quote: makeQuote({ market: 'vn', locale: 'vi' }) });

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage,
      retryContext,
      now: () => clock,
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer
    });

    store.hydrate();
    await store.addLine({ productId: PRODUCT_A, quantity: 3, marketAtAdd: 'vn' });
    expect(store.getSnapshot().count).toBe(3);

    await store.updateQuantity(makeIntentLine({ productId: PRODUCT_A }), 200);
    expect(store.getSnapshot().count).toBe(99);

    const currentLine = store.getSnapshot().cart!.lines[0]!;
    store.removeLine(currentLine);
    expect(store.getSnapshot().count).toBe(0);
    expect(store.getSnapshot().removedLine).toEqual(currentLine);
    expect(Array.from(timers.tasks.values())[0]?.delayMs).toBe(CART_UNDO_WINDOW_MS);

    await store.undoRemove();
    expect(store.getSnapshot().count).toBe(99);
    expect(store.getSnapshot().removedLine).toBeNull();
    expect(timers.tasks.size).toBe(0);

    // Expiring removal clears removedLine.
    store.removeLine(store.getSnapshot().cart!.lines[0]!);
    timers.flushAll();
    expect(store.getSnapshot().removedLine).toBeNull();

    // Place order with a line then restore from snapshot.
    await store.addLine({ productId: PRODUCT_B, quantity: 2, marketAtAdd: 'vn' });
    store.commitPlacedOrder({
      orderNumber: 'ATB-RESTORE-1',
      completedLines: [{ productId: PRODUCT_B, variantId: null, quantity: 2 }]
    });
    expect(store.getSnapshot().count).toBe(0);

    await expect(store.restoreOrderSnapshot('ATB-MISSING')).resolves.toBe(false);
    await expect(store.restoreOrderSnapshot('ATB-RESTORE-1')).resolves.toBe(true);
    expect(store.getSnapshot().count).toBe(2);
    expect(
      readOrderSnapshot('ATB-RESTORE-1', { storage: localStorage, now: clock })
    ).toBeNull();

    // Retry delegates to context when storefront context errored.
    store.syncContext({
      locale: 'vi',
      status: 'error',
      market: null,
      contextVersion: 3
    });
    expect(store.getSnapshot().blockReason).toBe('context_error');
    await store.retry();
    expect(retryContext).toHaveBeenCalledOnce();

    // Dispose cancels timers and freezes listener notifications.
    store.syncContext(vnReady);
    store.removeLine(store.getSnapshot().cart!.lines[0]!);
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispose();
    expect(timers.tasks.size).toBe(0);
    store.hydrate();
    expect(listener).not.toHaveBeenCalled();
  });

  it('settles runRequote to requote_failed and recovers on retry when fetchQuote rejects', async () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const initialQuote = makeQuote({ market: 'vn', locale: 'vi', subtotalMinor: 0 });
    const recoveredQuote = makeQuote({ market: 'vn', locale: 'vi', subtotalMinor: 250_000 });
    const fetchQuote = vi
      .fn<
        (input: { locale: 'vi' | 'en'; lines: CartIntentLine[] }) => Promise<CartQuoteActionState>
      >()
      .mockResolvedValueOnce({ status: 'success', quote: initialQuote })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        status: 'success',
        quote: recoveredQuote
      });

    const store = createCartStore(vnReady, {
      fetchQuote,
      getLocalStorage: () => localStorage,
      getSessionStorage: () => sessionStorage
    });

    store.hydrate();
    await store.addLine({ productId: PRODUCT_A, quantity: 1, marketAtAdd: 'vn' });

    const failedSnapshot = store.getSnapshot();
    expect(failedSnapshot.pending).toBe(false);
    expect(failedSnapshot.syncStatus).toBe('error');
    expect(failedSnapshot.blockReason).toBe('requote_failed');

    await store.retry();
    const recoveredSnapshot = store.getSnapshot();
    expect(recoveredSnapshot.pending).toBe(false);
    expect(recoveredSnapshot.syncStatus).toBe('ready');
    expect(recoveredSnapshot.blockReason).toBeNull();
    expect(recoveredSnapshot.quote?.subtotalMinor).toBe(250_000);
  });
});
