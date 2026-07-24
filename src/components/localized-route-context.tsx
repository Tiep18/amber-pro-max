'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { Locale } from '@/i18n/routing';

type LocalizedRouteRegistration = {
  path: string;
  slugs: Record<Locale, string>;
};

type LocalizedRouteContextValue = {
  registration: LocalizedRouteRegistration | null;
  register: (registration: LocalizedRouteRegistration) => void;
  clear: (path: string) => void;
};

const LocalizedRouteContext = createContext<LocalizedRouteContextValue | null>(null);

export function LocalizedRouteProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<LocalizedRouteRegistration | null>(null);
  const register = useCallback((next: LocalizedRouteRegistration) => {
    setRegistration(next);
  }, []);
  const clear = useCallback((path: string) => {
    setRegistration((current) => (current?.path === path ? null : current));
  }, []);
  const value = useMemo(
    () => ({ registration, register, clear }),
    [clear, register, registration]
  );

  return (
    <LocalizedRouteContext.Provider value={value}>
      {children}
    </LocalizedRouteContext.Provider>
  );
}

export function LocalizedRouteSlugs({
  path,
  slugs
}: {
  path: string;
  slugs: Record<Locale, string>;
}) {
  const context = useContext(LocalizedRouteContext);
  const register = context?.register;
  const clear = context?.clear;

  useEffect(() => {
    register?.({ path, slugs });
    return () => clear?.(path);
  }, [clear, path, register, slugs.en, slugs.vi]);

  return null;
}

export function useLocalizedRouteSlugs(pathname: string) {
  const registration = useContext(LocalizedRouteContext)?.registration;
  return registration?.path === pathname ? registration.slugs : undefined;
}
