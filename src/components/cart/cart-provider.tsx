'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react';
import { refreshCartQuoteAction } from '@/cart/actions';
import {
  createCartStore,
  type CartBlockReason,
  type CartContextSnapshot,
  type CartStore
} from '@/cart/cart-store';
import type {
  CartMarketGroupedChanges,
  CartMarketSyncIssue,
  CartMarketSyncState
} from '@/cart/market-sync';
import type {
  AddToCartIntent,
  CartIntentLine,
  GuestCartIntent
} from '@/cart/types';
import type { MarketCode } from '@/catalog/market';
import type { CartQuote } from '@/checkout/types';
import { useStorefrontContext } from '@/components/storefront-context';
import type { Locale } from '@/i18n/routing';

type CartContextValue = {
  cart: GuestCartIntent | null;
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  market: MarketCode | null;
  pending: boolean;
  syncStatus: CartMarketSyncState['status'] | 'resolving';
  changes: CartMarketGroupedChanges;
  issue: CartMarketSyncIssue | null;
  blockReason: CartBlockReason;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  addLine: (intent: AddToCartIntent) => Promise<void>;
  updateQuantity: CartStore['updateQuantity'];
  removeLine: CartStore['removeLine'];
  undoRemove: CartStore['undoRemove'];
  removedLine: CartIntentLine | null;
  commitPlacedOrder: CartStore['commitPlacedOrder'];
  restoreOrderSnapshot: CartStore['restoreOrderSnapshot'];
  refresh: CartStore['refresh'];
  retry: CartStore['retry'];
};

const CartContext = createContext<CartContextValue | null>(null);

function safeWindowStorage(kind: 'local' | 'session'): Storage | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function buildCartStore(
  initialContext: CartContextSnapshot,
  retryContextRef: { current: () => Promise<void> }
): CartStore {
  return createCartStore(initialContext, {
    fetchQuote: ({ locale: requestLocale, lines }) =>
      refreshCartQuoteAction({ locale: requestLocale, lines }),
    getLocalStorage: () => safeWindowStorage('local'),
    getSessionStorage: () => safeWindowStorage('session'),
    retryContext: () => retryContextRef.current()
  });
}

export function CartProvider({
  locale,
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const storefrontContext = useStorefrontContext();
  const [open, setOpen] = useState(false);

  const contextRef = useRef<CartContextSnapshot>({
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

  const retryContextRef = useRef(storefrontContext.retryContext);
  retryContextRef.current = storefrontContext.retryContext;

  const disposedStoresRef = useRef(new WeakSet<CartStore>());
  const [store, setStore] = useState<CartStore>(() =>
    buildCartStore(contextRef.current, retryContextRef)
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  useEffect(() => {
    if (disposedStoresRef.current.has(store)) {
      setStore(buildCartStore(contextRef.current, retryContextRef));
      return;
    }
    store.hydrate();
    return () => {
      disposedStoresRef.current.add(store);
      store.dispose();
    };
  }, [store]);

  useEffect(() => {
    if (disposedStoresRef.current.has(store)) {
      return;
    }
    store.syncContext({
      locale,
      status: storefrontContext.status,
      market: storefrontContext.market,
      contextVersion: storefrontContext.contextVersion
    });
  }, [
    store,
    locale,
    storefrontContext.status,
    storefrontContext.market,
    storefrontContext.contextVersion
  ]);

  const addLine = useCallback(
    async (intent: AddToCartIntent) => {
      await store.addLine(intent);
      setOpen(true);
    },
    [store]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart: snapshot.cart,
      quote: snapshot.quote,
      previousQuote: snapshot.previousQuote,
      market: snapshot.market,
      pending: snapshot.pending,
      syncStatus: snapshot.syncStatus,
      changes: snapshot.changes,
      issue: snapshot.issue,
      blockReason: snapshot.blockReason,
      open,
      setOpen,
      count: snapshot.count,
      addLine,
      updateQuantity: store.updateQuantity,
      removeLine: store.removeLine,
      undoRemove: store.undoRemove,
      removedLine: snapshot.removedLine,
      commitPlacedOrder: store.commitPlacedOrder,
      restoreOrderSnapshot: store.restoreOrderSnapshot,
      refresh: store.refresh,
      retry: store.retry
    }),
    [addLine, open, snapshot, store]
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
