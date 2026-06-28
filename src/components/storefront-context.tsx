'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';

type StorefrontUser = { email: string; isAdmin: boolean } | null;
type StorefrontContextValue = { market: MarketCode; user: StorefrontUser };

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

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

  useEffect(() => {
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

  const value = useMemo(() => context, [context]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefrontContext() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('storefront_context_missing');
  return context;
}
