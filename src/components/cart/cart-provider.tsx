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
import {
  cartLineKey,
  type AddToCartIntent,
  type CartIntentLine,
  type GuestCartIntent
} from '@/cart/types';
import type { CartQuote } from '@/checkout/types';

type RemovedLine = {
  line: CartIntentLine;
  timer: ReturnType<typeof setTimeout>;
};

type CartContextValue = {
  cart: GuestCartIntent | null;
  quote: CartQuote | null;
  pending: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  addLine: (intent: AddToCartIntent) => Promise<void>;
  updateQuantity: (line: CartIntentLine, quantity: number) => Promise<void>;
  removeLine: (line: CartIntentLine) => void;
  undoRemove: () => Promise<void>;
  removedLine: CartIntentLine | null;
  refresh: (lines?: CartIntentLine[]) => Promise<void>;
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

export function CartProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [cart, setCart] = useState<GuestCartIntent | null>(null);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState<RemovedLine | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const latestQuoteRequest = useRef(0);

  const persist = useCallback(
    async (lines: CartIntentLine[]) => {
      const next = writeGuestCart({ lines });
      setCart(next);
      setHydrated(true);
      const requestId = ++latestQuoteRequest.current;
      setPending(true);
      const result = await refreshCartQuoteAction({ locale, lines: next.lines });
      if (requestId === latestQuoteRequest.current) {
        setQuote(result.status === 'success' ? result.quote : null);
        setPending(false);
      }
      return next;
    },
    [locale]
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
    if (!current) {
      const next = emptyCart(new Date());
      setCart(next);
      setQuote(null);
      setHydrated(true);
      return;
    }
    setCart(current);
    setHydrated(true);
    void refresh(current.lines);
  }, [refresh]);

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

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      quote,
      pending,
      open,
      setOpen,
      count: hydrated ? (cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0) : 0,
      addLine,
      updateQuantity,
      removeLine,
      undoRemove,
      removedLine: removed?.line ?? null,
      refresh
    }),
    [addLine, cart, hydrated, open, pending, quote, refresh, removeLine, removed, undoRemove, updateQuantity]
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
