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
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';
import { shouldRevalidateStorefrontContext } from './storefront-context-policy';

type StorefrontUser = { email: string; isAdmin: boolean } | null;
type StorefrontContextValue = { market: MarketCode; user: StorefrontUser };
type StorefrontContextUpdate = Partial<StorefrontContextValue>;

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
export const STOREFRONT_CONTEXT_CHANGED = 'storefront-context-changed';

export function notifyStorefrontContextChanged(update: StorefrontContextUpdate = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<StorefrontContextUpdate>(STOREFRONT_CONTEXT_CHANGED, { detail: update })
  );
}

export function StorefrontContextProvider({
  locale,
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [context, setContext] = useState<StorefrontContextValue>({
    market: locale === 'vi' ? 'vn' : 'intl',
    user: null
  });
  const lastValidatedAt = useRef<number | null>(null);
  const requestInFlight = useRef<Promise<void> | null>(null);

  const refreshContext = useCallback(() => {
    if (requestInFlight.current) return requestInFlight.current;
    const request = fetch('/api/storefront-context', { cache: 'no-store' })
      .then((response) =>
        response.ok ? (response.json() as Promise<StorefrontContextValue>) : null
      )
      .then((value) => {
        if (value) {
          setContext(value);
          lastValidatedAt.current = Date.now();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        requestInFlight.current = null;
      });
    requestInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    const handleContextChanged = (event: Event) => {
      const detail = (event as CustomEvent<StorefrontContextUpdate>).detail;
      if (detail && Object.keys(detail).length > 0) {
        setContext((current) => ({ ...current, ...detail }));
      } else {
        void refreshContext();
      }
    };
    const handleFocus = () => {
      if (shouldRevalidateStorefrontContext(lastValidatedAt.current)) {
        void refreshContext();
      }
    };

    window.addEventListener(STOREFRONT_CONTEXT_CHANGED, handleContextChanged);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener(STOREFRONT_CONTEXT_CHANGED, handleContextChanged);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshContext]);

  const value = useMemo(() => context, [context]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefrontContext() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('storefront_context_missing');
  return context;
}
