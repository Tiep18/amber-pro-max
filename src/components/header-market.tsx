'use client';

import type { Locale } from '@/i18n/routing';
import { CommerceContextSwitcher } from './commerce-context-switcher';
import { useStorefrontContext } from './storefront-context';

type MarketLabels = {
  label: string;
  current: string;
  options: { vn: string; intl: string };
};

export function HeaderMarket({
  locale,
  labels,
  className
}: {
  locale: Locale;
  labels: MarketLabels;
  className?: string;
}) {
  const { market } = useStorefrontContext();

  return (
    <CommerceContextSwitcher
      locale={locale}
      activeMarket={market}
      className={className}
      labels={labels}
    />
  );
}
