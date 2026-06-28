'use client';

import type { Locale } from '@/i18n/routing';
import { AccountMenu } from './account-menu';
import { useStorefrontContext } from './storefront-context';

export function HeaderAccount({
  locale,
  mode = 'dropdown'
}: {
  locale: Locale;
  mode?: 'dropdown' | 'panel';
}) {
  const { user } = useStorefrontContext();
  return <AccountMenu locale={locale} user={user} mode={mode} />;
}
