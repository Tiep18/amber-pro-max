'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';

type StorefrontUser = { email: string; isAdmin: boolean } | null;
type StorefrontContextValue = { market: MarketCode; user: StorefrontUser };
type StorefrontContextUpdate = Partial<StorefrontContextValue>;

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
const STOREFRONT_CONTEXT_CHANGED = 'storefront-context-changed';

export function notifyStorefrontContextChanged(update: StorefrontContextUpdate = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<StorefrontContextUpdate>(STOREFRONT_CONTEXT_CHANGED, { detail: update }));
}

export function StorefrontContextProvider({
  locale,
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [context, setContext] = useState<StorefrontContextValue>({
    market: locale === 'vi' ? 'vn' : 'intl',
    user: null
  });

  const refreshContext = useCallback(() => {
    const controller = new AbortController();
    void fetch('/api/storefront-context', { cache: 'no-store', signal: controller.signal })
      .then((response) =>
        response.ok ? (response.json() as Promise<StorefrontContextValue>) : null
      )
      .then((value) => {
        if (value) setContext(value);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => refreshContext(), [pathname, refreshContext]);

  useEffect(() => {
    const handleContextChanged = (event: Event) => {
      const detail = (event as CustomEvent<StorefrontContextUpdate>).detail;
      if (detail && Object.keys(detail).length > 0) {
        setContext((current) => ({ ...current, ...detail }));
      } else {
        refreshContext();
      }
    };
    const handleFocus = () => refreshContext();

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
