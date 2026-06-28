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
import { STOREFRONT_CONTEXT_CHANGED } from './storefront-context';
import type { Locale } from '@/i18n/routing';

type WishlistContextValue = {
  selected: Record<string, boolean | undefined>;
  register: (productId: string) => void;
  setSelected: (productId: string, selected: boolean) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [selected, setSelectedState] = useState<Record<string, boolean | undefined>>({});
  const registered = useRef(new Set<string>());
  const loaded = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    timer.current = null;
    const productIds = [...pending.current].slice(0, 100);
    productIds.forEach((productId) => pending.current.delete(productId));
    if (productIds.length === 0) return;

    try {
      const query = new URLSearchParams({ productIds: productIds.join(','), locale });
      const response = await fetch(`/api/wishlist?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('wishlist_context_failed');
      const payload = (await response.json()) as { productIds?: unknown };
      const saved = new Set(Array.isArray(payload.productIds) ? payload.productIds : []);
      productIds.forEach((productId) => loaded.current.add(productId));
      setSelectedState((current) => {
        const next = { ...current };
        productIds.forEach((productId) => {
          next[productId] = saved.has(productId);
        });
        return next;
      });
    } catch {
      productIds.forEach((productId) => pending.current.add(productId));
    }
  }, [locale]);

  const scheduleFlush = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => void flush(), 0);
  }, [flush]);

  const register = useCallback(
    (productId: string) => {
      registered.current.add(productId);
      if (!loaded.current.has(productId)) {
        pending.current.add(productId);
        scheduleFlush();
      }
    },
    [scheduleFlush]
  );

  const setSelected = useCallback((productId: string, value: boolean) => {
    loaded.current.add(productId);
    setSelectedState((current) => ({ ...current, [productId]: value }));
  }, []);

  useEffect(() => {
    const resetForAuthChange = () => {
      loaded.current.clear();
      registered.current.forEach((productId) => pending.current.add(productId));
      setSelectedState({});
      scheduleFlush();
    };
    window.addEventListener(STOREFRONT_CONTEXT_CHANGED, resetForAuthChange);
    return () => {
      window.removeEventListener(STOREFRONT_CONTEXT_CHANGED, resetForAuthChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleFlush]);

  const value = useMemo(
    () => ({ selected, register, setSelected }),
    [register, selected, setSelected]
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlistProduct(productId: string) {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('wishlist_context_missing');
  useEffect(() => context.register(productId), [context, productId]);
  return {
    selected: context.selected[productId],
    setSelected: (value: boolean) => context.setSelected(productId, value)
  };
}

export function useSetWishlistSelected() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('wishlist_context_missing');
  return context.setSelected;
}
