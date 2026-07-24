'use client';

import type { Locale } from '@/i18n/routing';
import type { CommerceContextLabels } from './commerce-context-switcher';
import { CommerceContextSwitcher } from './commerce-context-switcher';
import { useStorefrontContext } from './storefront-context';

export function HeaderMarket({
  locale,
  labels,
  mode = 'desktop',
  className
}: {
  locale: Locale;
  labels: CommerceContextLabels & {
    checking: string;
    checkingAgain: string;
  };
  mode?: 'desktop' | 'mobile';
  className?: string;
}) {
  const {
    status,
    market,
    pendingMarket,
    issue,
    requestMarketChange,
    retryContext
  } = useStorefrontContext();

  const liveMessage =
    pendingMarket && (status === 'resolving' || status === 'retrying')
      ? labels.changing
      : status === 'retrying'
        ? labels.checkingAgain
        : status === 'resolving'
          ? labels.checking
          : '';

  return (
    <>
      <CommerceContextSwitcher
        locale={locale}
        activeMarket={market}
        pendingMarket={pendingMarket}
        status={status}
        issue={issue}
        labels={labels}
        requestMarketChange={requestMarketChange}
        retryContext={retryContext}
        mode={mode}
        className={className}
      />
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </span>
    </>
  );
}
