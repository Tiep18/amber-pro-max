import type { MarketCode } from '@/catalog/market';
import type { CartQuote } from '@/checkout/types';
import type { Locale } from '@/i18n/routing';
import type { StorefrontContextStatus } from '@/storefront/context-lifecycle';
import type { CartQuoteActionState } from './actions';
import { readGuestCart, writeGuestCart } from './guest-storage';
import {
  beginMarketRequote,
  emptyCartMarketChanges,
  failMarketRequote,
  settleMarketRequote,
  type CartMarketGroupedChanges,
  type CartMarketSyncIssue,
  type CartMarketSyncState
} from './market-sync';
import { mergeCartIntents } from './merge';
import {
  clearOrderSnapshot,
  readOrderSnapshot,
  writeOrderSnapshot
} from './order-snapshot';
import {
  clearCartQuoteCache,
  readCartQuoteCache,
  writeCartQuoteCache
} from './quote-cache';
import {
  cartLineKey,
  maxCartQuantity,
  type AddToCartIntent,
  type CartIntentLine,
  type GuestCartIntent
} from './types';

export const CART_UNDO_WINDOW_MS = 8000;

export type CompletedOrderLine = Pick<
  CartIntentLine,
  'productId' | 'variantId' | 'quantity'
>;

export type CartContextSnapshot = {
  locale: Locale;
  status: StorefrontContextStatus;
  market: MarketCode | null;
  contextVersion: number;
};

export type CartBlockReason =
  | 'context_resolving'
  | 'context_error'
  | 'requote_updating'
  | 'requote_failed'
  | null;

export type CartStoreSnapshot = Readonly<{
  hydrated: boolean;
  cart: GuestCartIntent | null;
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  market: MarketCode | null;
  pending: boolean;
  syncStatus: CartMarketSyncState['status'] | 'resolving';
  changes: CartMarketGroupedChanges;
  issue: CartMarketSyncIssue | null;
  blockReason: CartBlockReason;
  count: number;
  removedLine: CartIntentLine | null;
}>;

export type CartStoreTimer = ReturnType<typeof setTimeout>;

export type CartStorePorts = {
  fetchQuote: (input: {
    locale: Locale;
    lines: CartIntentLine[];
  }) => Promise<CartQuoteActionState>;
  getLocalStorage?: () => Storage | null;
  getSessionStorage?: () => Storage | null;
  retryContext?: () => Promise<void>;
  now?: () => Date;
  scheduleTimer?: (callback: () => void, delayMs: number) => CartStoreTimer;
  clearTimer?: (timer: CartStoreTimer) => void;
  undoWindowMs?: number;
};

export type CartStore = {
  getSnapshot: () => CartStoreSnapshot;
  getServerSnapshot: () => CartStoreSnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => void;
  syncContext: (context: CartContextSnapshot) => void;
  addLine: (intent: AddToCartIntent) => Promise<void>;
  updateQuantity: (line: CartIntentLine, quantity: number) => Promise<void>;
  removeLine: (line: CartIntentLine) => void;
  undoRemove: () => Promise<void>;
  commitPlacedOrder: (input: {
    orderNumber: string;
    completedLines: readonly CompletedOrderLine[];
  }) => void;
  restoreOrderSnapshot: (orderNumber: string) => Promise<boolean>;
  refresh: (lines?: CartIntentLine[]) => Promise<void>;
  retry: () => Promise<void>;
  dispose: () => void;
};

type RemovedLineEntry = {
  line: CartIntentLine;
  timer: CartStoreTimer;
};

/**
 * Reconcile placed order quantities against the current cart lines while
 * keeping capped surpluses or concurrent additions intact.
 */
export function subtractCompletedOrderLines({
  currentLines,
  completedLines,
  updatedAt
}: {
  currentLines: CartIntentLine[];
  completedLines: CompletedOrderLine[];
  updatedAt: string;
}) {
  const completedQuantityByLine = new Map<string, number>();

  for (const line of completedLines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const key = cartLineKey({ ...line, variantId: line.variantId ?? null });
    completedQuantityByLine.set(
      key,
      (completedQuantityByLine.get(key) ?? 0) + line.quantity
    );
  }

  return currentLines.flatMap((line) => {
    const completedQuantity = completedQuantityByLine.get(cartLineKey(line)) ?? 0;
    if (completedQuantity <= 0) return [line];

    const remainingQuantity = line.quantity - completedQuantity;
    return remainingQuantity > 0
      ? [{ ...line, quantity: remainingQuantity, updatedAt }]
      : [];
  });
}

function emptyCart(now: Date): GuestCartIntent {
  return {
    version: 1,
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lines: []
  };
}

function sameLine(
  left: Pick<CartIntentLine, 'productId'> & { variantId?: string | null },
  right: Pick<CartIntentLine, 'productId'> & { variantId?: string | null }
) {
  return (
    cartLineKey({ ...left, variantId: left.variantId ?? null }) ===
    cartLineKey({ ...right, variantId: right.variantId ?? null })
  );
}

function createSyncState(
  market: MarketCode,
  contextVersion: number,
  lines: CartIntentLine[],
  quote: CartQuote | null = null
): CartMarketSyncState {
  return {
    status: quote ? 'ready' : 'idle',
    committedMarket: market,
    contextVersion,
    nextRequestId: 0,
    activeRequestId: null,
    intentLines: lines,
    quote,
    previousQuote: null,
    changes: emptyCartMarketChanges(),
    issue: null,
    rollbackContext: null
  };
}

function defaultLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function defaultSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Create a framework-free Cart Store owning persisted guest cart lines,
 * quote caching, race-guarded market requotes, undo removal, and atomic order
 * completion reconciliation.
 */
export function createCartStore(
  initialContext: CartContextSnapshot,
  ports: CartStorePorts
): CartStore {
  const getLocalStorage = ports.getLocalStorage ?? defaultLocalStorage;
  const getSessionStorage = ports.getSessionStorage ?? defaultSessionStorage;
  const now = ports.now ?? (() => new Date());
  const scheduleTimer =
    ports.scheduleTimer ??
    ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
  const clearTimer =
    ports.clearTimer ?? ((timer: CartStoreTimer) => clearTimeout(timer));
  const undoWindowMs = ports.undoWindowMs ?? CART_UNDO_WINDOW_MS;

  const listeners = new Set<() => void>();
  let context: CartContextSnapshot = initialContext;
  let hydrated = false;
  let cart: GuestCartIntent | null = null;
  let syncState: CartMarketSyncState | null = null;
  let removed: RemovedLineEntry | null = null;
  let lastObservedContext: string | null = null;
  let lastReadyContext: string | null = null;
  let disposed = false;

  function buildSnapshot(): CartStoreSnapshot {
    const contextReady =
      context.status === 'ready' && context.market !== null;
    const quoteAgrees =
      contextReady &&
      syncState?.status === 'ready' &&
      syncState.quote?.market === context.market &&
      syncState.contextVersion === context.contextVersion;
    const quote = quoteAgrees ? (syncState?.quote ?? null) : null;
    const pending =
      !hydrated ||
      context.status === 'resolving' ||
      context.status === 'retrying' ||
      syncState === null ||
      syncState.status === 'idle' ||
      syncState.status === 'updating';
    const blockReason: CartBlockReason =
      context.status === 'error'
        ? 'context_error'
        : !contextReady
          ? 'context_resolving'
          : syncState?.status === 'error'
            ? 'requote_failed'
            : !quoteAgrees
              ? 'requote_updating'
              : null;

    return {
      hydrated,
      cart,
      quote,
      previousQuote: syncState?.previousQuote ?? null,
      market: syncState?.committedMarket ?? context.market,
      pending,
      syncStatus: !contextReady
        ? 'resolving'
        : (syncState?.status ?? 'resolving'),
      changes: syncState?.changes ?? emptyCartMarketChanges(),
      issue: syncState?.issue ?? null,
      blockReason,
      count: hydrated
        ? (cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0)
        : 0,
      removedLine: removed?.line ?? null
    };
  }

  let snapshot: CartStoreSnapshot = buildSnapshot();
  const serverSnapshot: CartStoreSnapshot = snapshot;

  function emit() {
    if (disposed) {
      return;
    }
    snapshot = buildSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }

  function safeLocalStorage() {
    try {
      return getLocalStorage();
    } catch {
      return null;
    }
  }

  function safeSessionStorage() {
    try {
      return getSessionStorage();
    } catch {
      return null;
    }
  }

  function readCurrentCart(referenceNow: Date) {
    return (
      readGuestCart({ storage: safeLocalStorage(), now: referenceNow }) ??
      emptyCart(referenceNow)
    );
  }

  async function runRequote(
    lines: CartIntentLine[],
    identity: { locale: Locale; market: MarketCode; contextVersion: number }
  ) {
    if (disposed) {
      return;
    }
    clearCartQuoteCache(safeSessionStorage());
    const current =
      syncState ??
      createSyncState(identity.market, identity.contextVersion, lines);
    const begun = beginMarketRequote(current, {
      locale: identity.locale,
      committedMarket: identity.market,
      contextVersion: identity.contextVersion,
      lines
    });
    syncState = begun.state;
    emit();

    const result = await ports.fetchQuote({
      locale: identity.locale,
      lines: begun.request.lines
    });
    if (
      disposed ||
      context.status !== 'ready' ||
      context.locale !== identity.locale ||
      context.market !== identity.market ||
      context.contextVersion !== identity.contextVersion
    ) {
      return;
    }

    const active = syncState;
    if (!active) {
      return;
    }
    const settled =
      result.status === 'success'
        ? settleMarketRequote(active, begun.request.requestId, result.quote)
        : failMarketRequote(active, begun.request.requestId, {
            code: 'requote_failed'
          });
    if (settled === active) {
      return;
    }

    syncState = settled;
    emit();
    if (settled.status === 'ready' && settled.quote) {
      writeCartQuoteCache({
        locale: identity.locale,
        market: identity.market,
        contextVersion: identity.contextVersion,
        lines,
        quote: settled.quote,
        storage: safeSessionStorage(),
        now: now().getTime()
      });
    }
  }

  function reconcileReadyContext() {
    if (!hydrated || context.status !== 'ready' || !context.market) {
      return;
    }

    const identity = {
      locale: context.locale,
      market: context.market,
      contextVersion: context.contextVersion
    };
    const marker = `${identity.locale}:${identity.market}:${identity.contextVersion}`;
    if (lastReadyContext === marker) {
      return;
    }

    const lines = cart?.lines ?? [];
    const isFirstReadyContext = lastReadyContext === null;
    lastReadyContext = marker;

    if (isFirstReadyContext) {
      const cachedQuote = readCartQuoteCache({
        ...identity,
        lines,
        storage: safeSessionStorage(),
        now: now().getTime()
      });
      if (cachedQuote) {
        syncState = createSyncState(
          identity.market,
          identity.contextVersion,
          lines,
          cachedQuote
        );
        emit();
        return;
      }
    }

    void runRequote(lines, identity);
  }

  async function persist(lines: CartIntentLine[], referenceNow = now()) {
    const next = writeGuestCart(
      { lines },
      { storage: safeLocalStorage(), now: referenceNow }
    );
    cart = next;
    hydrated = true;

    if (context.status === 'ready' && context.market) {
      emit();
      await runRequote(next.lines, {
        locale: context.locale,
        market: context.market,
        contextVersion: context.contextVersion
      });
      return;
    }

    if (syncState) {
      syncState = {
        ...syncState,
        status: 'updating',
        activeRequestId: null,
        intentLines: next.lines,
        quote: null,
        issue: null
      };
    }
    emit();
  }

  function clearPendingRemoval() {
    if (!removed) {
      return null;
    }
    clearTimer(removed.timer);
    const entry = removed;
    removed = null;
    return entry.line;
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    hydrate() {
      if (disposed) {
        return;
      }
      cart = readCurrentCart(now());
      hydrated = true;
      emit();
      reconcileReadyContext();
    },

    syncContext(nextContext) {
      if (disposed) {
        return;
      }
      const prevLocale = context.locale;
      const marker = `${nextContext.locale}:${nextContext.market ?? 'none'}:${nextContext.contextVersion}`;
      if (lastObservedContext !== null && lastObservedContext !== marker) {
        clearCartQuoteCache(safeSessionStorage());
      }
      lastObservedContext = marker;

      const contextChanged =
        context.locale !== nextContext.locale ||
        context.status !== nextContext.status ||
        context.market !== nextContext.market ||
        context.contextVersion !== nextContext.contextVersion;
      const localeChanged = nextContext.locale !== prevLocale;
      context = nextContext;

      if (hydrated && localeChanged) {
        cart = readCurrentCart(now());
      }
      if (contextChanged || (hydrated && localeChanged)) {
        emit();
      }
      reconcileReadyContext();
    },

    async addLine(intent) {
      const referenceNow = now();
      const timestamp = referenceNow.toISOString();
      const current = readCurrentCart(referenceNow);
      const existing = current.lines.find((line) => sameLine(line, intent));
      const lines = existing
        ? current.lines.map((line) =>
            sameLine(line, intent)
              ? {
                  ...line,
                  quantity: Math.min(maxCartQuantity, line.quantity + intent.quantity),
                  updatedAt: timestamp
                }
              : line
          )
        : [
            ...current.lines,
            {
              productId: intent.productId,
              variantId: intent.variantId ?? null,
              quantity: Math.min(maxCartQuantity, Math.max(1, intent.quantity)),
              marketAtAdd: intent.marketAtAdd,
              addedAt: timestamp,
              updatedAt: timestamp
            }
          ];
      await persist(lines, referenceNow);
    },

    async updateQuantity(line, quantity) {
      const referenceNow = now();
      const current = readCurrentCart(referenceNow);
      const nextQuantity = Math.max(1, Math.min(maxCartQuantity, quantity));
      const lines = current.lines.map((candidate) =>
        sameLine(candidate, line)
          ? {
              ...candidate,
              quantity: nextQuantity,
              updatedAt: referenceNow.toISOString()
            }
          : candidate
      );
      await persist(lines, referenceNow);
    },

    removeLine(line) {
      const referenceNow = now();
      const current = readCurrentCart(referenceNow);
      const lines = current.lines.filter(
        (candidate) => !sameLine(candidate, line)
      );
      clearPendingRemoval();
      const timer = scheduleTimer(() => {
        removed = null;
        emit();
      }, undoWindowMs);
      removed = { line, timer };
      void persist(lines, referenceNow);
    },

    async undoRemove() {
      const restoredLine = clearPendingRemoval();
      if (!restoredLine) {
        return;
      }
      const referenceNow = now();
      const current = readCurrentCart(referenceNow);
      await persist([...current.lines, restoredLine], referenceNow);
    },

    commitPlacedOrder({ orderNumber, completedLines }) {
      const referenceNow = now();
      const storage = safeLocalStorage();
      const current = readCurrentCart(referenceNow);

      const snapshotLines = completedLines.flatMap((completed) => {
        const intentLine = current.lines.find((candidate) =>
          sameLine(candidate, {
            productId: completed.productId,
            variantId: completed.variantId ?? null
          })
        );
        return intentLine ? [{ ...intentLine, quantity: completed.quantity }] : [];
      });
      if (snapshotLines.length > 0) {
        writeOrderSnapshot(
          { orderNumber, lines: snapshotLines },
          { storage, now: referenceNow }
        );
      }

      const remainingLines = subtractCompletedOrderLines({
        currentLines: current.lines,
        completedLines: [...completedLines],
        updatedAt: referenceNow.toISOString()
      });
      clearCartQuoteCache(safeSessionStorage());
      const nextCart = writeGuestCart(
        { lines: remainingLines },
        { storage, now: referenceNow }
      );
      clearPendingRemoval();

      cart = nextCart;
      hydrated = true;
      if (syncState) {
        syncState = {
          ...syncState,
          status:
            context.status === 'ready' && context.market ? 'updating' : 'idle',
          activeRequestId: null,
          intentLines: nextCart.lines,
          quote: null,
          previousQuote: null,
          changes: emptyCartMarketChanges(),
          issue: null,
          rollbackContext: null
        };
      }
      emit();

      if (context.status === 'ready' && context.market) {
        void runRequote(nextCart.lines, {
          locale: context.locale,
          market: context.market,
          contextVersion: context.contextVersion
        });
      }
    },

    async restoreOrderSnapshot(orderNumber) {
      const referenceNow = now();
      const storage = safeLocalStorage();
      const orderSnapshot = readOrderSnapshot(orderNumber, {
        storage,
        now: referenceNow
      });
      if (!orderSnapshot) {
        return false;
      }

      const current = readCurrentCart(referenceNow);
      const merged = mergeCartIntents({
        baseLines: current.lines,
        incomingLines: orderSnapshot.lines,
        now: referenceNow.toISOString()
      });
      clearOrderSnapshot(orderNumber, { storage, now: referenceNow });
      await persist(merged.lines, referenceNow);
      return true;
    },

    async refresh(lines) {
      const referenceNow = now();
      const currentLines =
        lines ??
        readGuestCart({ storage: safeLocalStorage(), now: referenceNow })?.lines ??
        [];
      await persist(currentLines, referenceNow);
    },

    async retry() {
      if (context.status === 'error' || context.status === 'retrying') {
        await ports.retryContext?.();
        return;
      }
      if (context.status !== 'ready' || !context.market) {
        return;
      }
      await runRequote(cart?.lines ?? [], {
        locale: context.locale,
        market: context.market,
        contextVersion: context.contextVersion
      });
    },

    dispose() {
      disposed = true;
      clearPendingRemoval();
      listeners.clear();
    }
  };
}
