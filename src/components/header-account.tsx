'use client';

import {useSyncExternalStore} from 'react';
import type { Locale } from '@/i18n/routing';
import { AccountMenu } from './account-menu';
import { useStorefrontContext } from './storefront-context';

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export function HeaderAccount({
  locale,
  mode = 'dropdown'
}: {
  locale: Locale;
  mode?: 'dropdown' | 'panel';
}) {
  const { user } = useStorefrontContext();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );

  return <AccountMenu locale={locale} user={hydrated ? user : null} mode={mode} />;
}
