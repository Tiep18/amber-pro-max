'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { Locale } from '@/i18n/routing';
import { refreshCartQuoteAction } from '@/cart/actions';
import { readGuestCart, writeGuestCart } from '@/cart/guest-storage';
import { clearCartQuoteCache, readCartQuoteCache, writeCartQuoteCache } from '@/cart/quote-cache';
import {
  beginMarketRequote,
  emptyCartMarketChanges,
  failMarketRequote,
  settleMarketRequote,
  type CartMarketGroupedChanges,
  type CartMarketSyncIssue,
  type CartMarketSyncState
} from '@/cart/market-sync';
import { subtractCompletedOrderLines, type CompletedOrderLine } from '@/cart/order-completion';
import {
  cartLineKey,
  type AddToCartIntent,
  type CartIntentLine,
  type GuestCartIntent
} from '@/cart/types';
import type { CartQuote } from '@/checkout/types';
import type { MarketCode } from '@/catalog/market';
import { useStorefrontContext } from '@/components/storefront-context';

type RemovedLine = {
  line: CartIntentLine;
  timer: ReturnType<typeof setTimeout>;
};

type CartContextValue = {
  cart: GuestCartIntent | null;
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  market: MarketCode | null;
  pending: boolean;
  syncStatus: CartMarketSyncState['status'] | 'resolving';
  changes: CartMarketGroupedChanges;
  issue: CartMarketSyncIssue | null;
  blockReason: 'context_resolving' | 'context_error' | 'requote_updating' | 'requote_failed' | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  addLine: (intent: AddToCartIntent) => Promise<void>;
  updateQuantity: (line: CartIntentLine, quantity: number) => Promise<void>;
  removeLine: (line: CartIntentLine) => void;
  undoRemove: () => Promise<void>;
  removedLine: CartIntentLine | null;
  completeOrder: (lines: CompletedOrderLine[]) => void;
  refresh: (lines?: CartIntentLine[]) => Promise<void>;
  retry: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

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

export function CartProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const storefrontContext = useStorefrontContext();
  const [cart, setCart] = useState<GuestCartIntent | null>(null);
  const [syncState, setSyncState] = useState<CartMarketSyncState | null>(null);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState<RemovedLine | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const cartRef = useRef<GuestCartIntent | null>(null);
  const syncStateRef = useRef<CartMarketSyncState | null>(null);
  const lastObservedContext = useRef<string | null>(null);
  const lastReadyContext = useRef<string | null>(null);
  const contextRef = useRef({
    locale,
    status: storefrontContext.status,
    market: storefrontContext.market,
    contextVersion: storefrontContext.contextVersion
  });
  contextRef.current = {
    locale,
    status: storefrontContext.status,
    market: storefrontContext.market,
    contextVersion: storefrontContext.contextVersion
  };

  const commitSyncState = useCallback((next: CartMarketSyncState) => {
    syncStateRef.current = next;
    setSyncState(next);
  }, []);

  const runRequote = useCallback(
    async (
      lines: CartIntentLine[],
      identity: { locale: Locale; market: MarketCode; contextVersion: number }
    ) => {
      clearCartQuoteCache();
      const current =
        syncStateRef.current ?? createSyncState(identity.market, identity.contextVersion, lines);
      const begun = beginMarketRequote(current, {
        locale: identity.locale,
        committedMarket: identity.market,
        contextVersion: identity.contextVersion,
        lines
      });
      commitSyncState(begun.state);

      const result = await refreshCartQuoteAction({
        locale,
        lines: begun.request.lines
      });
      const latestContext = contextRef.current;
      if (
        latestContext.status !== 'ready' ||
        latestContext.locale !== identity.locale ||
        latestContext.market !== identity.market ||
        latestContext.contextVersion !== identity.contextVersion
      ) {
        return;
      }

      const active = syncStateRef.current;
      if (!active) return;
      const settled =
        result.status === 'success'
          ? settleMarketRequote(active, begun.request.requestId, result.quote)
          : failMarketRequote(active, begun.request.requestId, {
              code: 'requote_failed'
            });
      if (settled === active) return;

      commitSyncState(settled);
      if (settled.status === 'ready' && settled.quote) {
        writeCartQuoteCache({
          locale: identity.locale,
          market: identity.market,
          contextVersion: identity.contextVersion,
          lines,
          quote: settled.quote
        });
      }
    },
    [commitSyncState, locale]
  );

  const persist = useCallback(
    async (lines: CartIntentLine[]) => {
      const next = writeGuestCart({ lines });
      cartRef.current = next;
      setCart(next);
      setHydrated(true);
      const context = contextRef.current;
      if (context.status === 'ready' && context.market) {
        await runRequote(next.lines, {
          locale: context.locale,
          market: context.market,
          contextVersion: context.contextVersion
        });
      } else if (syncStateRef.current) {
        commitSyncState({
          ...syncStateRef.current,
          status: 'updating',
          activeRequestId: null,
          intentLines: next.lines,
          quote: null,
          issue: null
        });
      }
      return next;
    },
    [commitSyncState, runRequote]
  );

  const refresh = useCallback(
    async (lines?: CartIntentLine[]) => {
      const current = lines ?? readGuestCart()?.lines ?? [];
      await persist(current);
    },
    [persist]
  );

  useEffect(() => {
    const current = readGuestCart();
    const next = current ?? emptyCart(new Date());
    cartRef.current = next;
    setCart(next);
    setHydrated(true);
  }, [locale]);

  useEffect(() => {
    const marker = `${locale}:${storefrontContext.market ?? 'none'}:${storefrontContext.contextVersion}`;
    if (lastObservedContext.current !== null && lastObservedContext.current !== marker) {
      clearCartQuoteCache();
    }
    lastObservedContext.current = marker;
  }, [locale, storefrontContext.contextVersion, storefrontContext.market]);

  useEffect(() => {
    if (!hydrated || storefrontContext.status !== 'ready' || !storefrontContext.market) {
      return;
    }

    const identity = {
      locale,
      market: storefrontContext.market,
      contextVersion: storefrontContext.contextVersion
    };
    const marker = `${identity.locale}:${identity.market}:${identity.contextVersion}`;
    if (lastReadyContext.current === marker) {
      return;
    }

    const lines = cartRef.current?.lines ?? [];
    const isFirstReadyContext = lastReadyContext.current === null;
    lastReadyContext.current = marker;

    if (isFirstReadyContext) {
      const cachedQuote = readCartQuoteCache({ ...identity, lines });
      if (cachedQuote) {
        commitSyncState(
          createSyncState(identity.market, identity.contextVersion, lines, cachedQuote)
        );
        return;
      }
    }

    void runRequote(lines, identity);
  }, [
    commitSyncState,
    hydrated,
    locale,
    runRequote,
    storefrontContext.contextVersion,
    storefrontContext.market,
    storefrontContext.status
  ]);

  useEffect(
    () => () => {
      if (removed) {
        clearTimeout(removed.timer);
      }
    },
    [removed]
  );

  const addLine = useCallback(
    async (intent: AddToCartIntent) => {
      const now = new Date().toISOString();
      const current = readGuestCart() ?? emptyCart(new Date());
      const existing = current.lines.find((line) => sameLine(line, intent));
      const lines = existing
        ? current.lines.map((line) =>
            sameLine(line, intent)
              ? { ...line, quantity: Math.min(99, line.quantity + intent.quantity), updatedAt: now }
              : line
          )
        : [
            ...current.lines,
            {
              productId: intent.productId,
              variantId: intent.variantId ?? null,
              quantity: intent.quantity,
              marketAtAdd: intent.marketAtAdd,
              addedAt: now,
              updatedAt: now
            }
          ];
      await persist(lines);
      setOpen(true);
    },
    [persist]
  );

  const updateQuantity = useCallback(
    async (line: CartIntentLine, quantity: number) => {
      const current = readGuestCart() ?? emptyCart(new Date());
      const nextQuantity = Math.max(1, Math.min(99, quantity));
      const lines = current.lines.map((candidate) =>
        sameLine(candidate, line)
          ? { ...candidate, quantity: nextQuantity, updatedAt: new Date().toISOString() }
          : candidate
      );
      await persist(lines);
    },
    [persist]
  );

  const removeLine = useCallback(
    (line: CartIntentLine) => {
      const current = readGuestCart() ?? emptyCart(new Date());
      const lines = current.lines.filter((candidate) => !sameLine(candidate, line));
      void persist(lines);
      if (removed) {
        clearTimeout(removed.timer);
      }
      const timer = setTimeout(() => setRemoved(null), 8000);
      setRemoved({ line, timer });
    },
    [persist, removed]
  );

  const undoRemove = useCallback(async () => {
    if (!removed) {
      return;
    }
    clearTimeout(removed.timer);
    const current = readGuestCart() ?? emptyCart(new Date());
    await persist([...current.lines, removed.line]);
    setRemoved(null);
  }, [persist, removed]);

  const completeOrder = useCallback((completedLines: CompletedOrderLine[]) => {
    const current = readGuestCart() ?? emptyCart(new Date());
    const lines = subtractCompletedOrderLines({
      currentLines: current.lines,
      completedLines,
      updatedAt: new Date().toISOString()
    });
    clearCartQuoteCache();
    writeGuestCart({ lines });
  }, []);

  const retry = useCallback(async () => {
    if (storefrontContext.status === 'error' || storefrontContext.status === 'retrying') {
      await storefrontContext.retryContext();
      return;
    }
    const context = contextRef.current;
    if (context.status !== 'ready' || !context.market) return;
    await runRequote(cartRef.current?.lines ?? [], {
      locale: context.locale,
      market: context.market,
      contextVersion: context.contextVersion
    });
  }, [runRequote, storefrontContext]);

  const contextReady = storefrontContext.status === 'ready' && storefrontContext.market !== null;
  const quoteAgrees =
    contextReady &&
    syncState?.status === 'ready' &&
    syncState.quote?.market === storefrontContext.market &&
    syncState.contextVersion === storefrontContext.contextVersion;
  const quote = quoteAgrees ? syncState.quote : null;
  const pending =
    !hydrated ||
    storefrontContext.status === 'resolving' ||
    storefrontContext.status === 'retrying' ||
    syncState === null ||
    syncState.status === 'idle' ||
    syncState.status === 'updating';
  const blockReason: CartContextValue['blockReason'] =
    storefrontContext.status === 'error'
      ? 'context_error'
      : !contextReady
        ? 'context_resolving'
        : syncState?.status === 'error'
          ? 'requote_failed'
          : !quoteAgrees
            ? 'requote_updating'
            : null;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      quote,
      previousQuote: syncState?.previousQuote ?? null,
      market: syncState?.committedMarket ?? storefrontContext.market,
      pending,
      syncStatus: !contextReady ? 'resolving' : (syncState?.status ?? 'resolving'),
      changes: syncState?.changes ?? emptyCartMarketChanges(),
      issue: syncState?.issue ?? null,
      blockReason,
      open,
      setOpen,
      count: hydrated ? (cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0) : 0,
      addLine,
      updateQuantity,
      removeLine,
      undoRemove,
      removedLine: removed?.line ?? null,
      completeOrder,
      refresh,
      retry
    }),
    [
      addLine,
      blockReason,
      cart,
      completeOrder,
      contextReady,
      hydrated,
      open,
      pending,
      quote,
      refresh,
      retry,
      removeLine,
      removed,
      storefrontContext.market,
      syncState,
      undoRemove,
      updateQuantity
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('cart_context_missing');
  }
  return context;
}
