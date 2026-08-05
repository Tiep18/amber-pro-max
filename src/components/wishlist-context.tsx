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
  register: (productId: string) => () => void;
  setSelected: (productId: string, selected: boolean) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const WISHLIST_BATCH_DELAY_MS = 20;

type WishlistRegistration = {
  count: number;
  lifecycle: number;
};

export class WishlistRegistrationRegistry {
  private readonly registrations = new Map<string, WishlistRegistration>();
  private nextLifecycle = 0;

  register(productId: string) {
    const current = this.registrations.get(productId);
    if (current) {
      current.count += 1;
      return current.lifecycle;
    }

    const lifecycle = ++this.nextLifecycle;
    this.registrations.set(productId, { count: 1, lifecycle });
    return lifecycle;
  }

  unregister(productId: string) {
    const current = this.registrations.get(productId);
    if (!current) return false;
    if (current.count > 1) {
      current.count -= 1;
      return false;
    }

    this.registrations.delete(productId);
    return true;
  }

  has(productId: string) {
    return this.registrations.has(productId);
  }

  matches(productId: string, lifecycle: number) {
    return this.registrations.get(productId)?.lifecycle === lifecycle;
  }

  lifecycleFor(productId: string) {
    return this.registrations.get(productId)?.lifecycle ?? null;
  }

  activeProductIds() {
    return [...this.registrations.keys()];
  }
}

export function WishlistProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [selected, setSelectedState] = useState<Record<string, boolean | undefined>>({});
  const [registered] = useState(() => new WishlistRegistrationRegistry());
  const loaded = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGeneration = useRef(0);
  const inFlight = useRef(new Set<AbortController>());

  const flush = useCallback(async () => {
    timer.current = null;
    const productIds: string[] = [];
    const lifecycles = new Map<string, number>();
    for (const productId of pending.current) {
      if (!registered.has(productId)) {
        pending.current.delete(productId);
        continue;
      }
      if (productIds.length >= 100) continue;

      const lifecycle = registered.lifecycleFor(productId);
      if (lifecycle === null) continue;
      productIds.push(productId);
      lifecycles.set(productId, lifecycle);
      pending.current.delete(productId);
    }
    if (productIds.length === 0) return;

    const generation = requestGeneration.current;
    const controller = new AbortController();
    inFlight.current.add(controller);
    try {
      const query = new URLSearchParams({ productIds: productIds.join(','), locale });
      const response = await fetch(`/api/wishlist?${query}`, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('wishlist_context_failed');
      const payload = (await response.json()) as { productIds?: unknown };
      const saved = new Set(Array.isArray(payload.productIds) ? payload.productIds : []);
      if (generation !== requestGeneration.current) return;

      const activeProductIds = productIds.filter((productId) => {
        const lifecycle = lifecycles.get(productId);
        return lifecycle !== undefined && registered.matches(productId, lifecycle);
      });
      activeProductIds.forEach((productId) => loaded.current.add(productId));
      setSelectedState((current) => {
        const next = { ...current };
        activeProductIds.forEach((productId) => {
          next[productId] = saved.has(productId);
        });
        return next;
      });
    } catch {
      if (generation === requestGeneration.current) {
        productIds.forEach((productId) => {
          const lifecycle = lifecycles.get(productId);
          if (lifecycle !== undefined && registered.matches(productId, lifecycle)) {
            pending.current.add(productId);
          }
        });
      }
    } finally {
      inFlight.current.delete(controller);
    }
  }, [locale, registered]);

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), WISHLIST_BATCH_DELAY_MS);
  }, [flush]);

  const register = useCallback(
    (productId: string) => {
      registered.register(productId);
      if (!loaded.current.has(productId)) {
        pending.current.add(productId);
        scheduleFlush();
      }

      return () => {
        if (!registered.unregister(productId)) return;
        pending.current.delete(productId);
        loaded.current.delete(productId);
        setSelectedState((current) => {
          if (!(productId in current)) return current;
          const next = { ...current };
          delete next[productId];
          return next;
        });
      };
    },
    [registered, scheduleFlush]
  );

  const setSelected = useCallback((productId: string, value: boolean) => {
    loaded.current.add(productId);
    setSelectedState((current) => ({ ...current, [productId]: value }));
  }, []);

  useEffect(() => {
    const resetForAuthChange = () => {
      requestGeneration.current += 1;
      inFlight.current.forEach((controller) => controller.abort());
      inFlight.current.clear();
      loaded.current.clear();
      pending.current.clear();
      const activeProductIds = registered.activeProductIds();
      activeProductIds.forEach((productId) => pending.current.add(productId));
      setSelectedState({});
      if (activeProductIds.length > 0) scheduleFlush();
    };
    window.addEventListener(STOREFRONT_CONTEXT_CHANGED, resetForAuthChange);
    return () => {
      window.removeEventListener(STOREFRONT_CONTEXT_CHANGED, resetForAuthChange);
      if (timer.current) clearTimeout(timer.current);
      requestGeneration.current += 1;
      inFlight.current.forEach((controller) => controller.abort());
      inFlight.current.clear();
    };
  }, [registered, scheduleFlush]);

  const value = useMemo(
    () => ({ selected, register, setSelected }),
    [register, selected, setSelected]
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlistProduct(productId: string) {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('wishlist_context_missing');
  const { register, selected, setSelected } = context;
  useEffect(() => register(productId), [productId, register]);
  return {
    selected: selected[productId],
    setSelected: (value: boolean) => setSelected(productId, value)
  };
}

export function useSetWishlistSelected() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('wishlist_context_missing');
  return context.setSelected;
}
