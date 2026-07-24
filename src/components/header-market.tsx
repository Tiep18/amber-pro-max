'use client';

import { useSyncExternalStore } from 'react';
import type { Locale } from '@/i18n/routing';
import type { CommerceContextLabels } from './commerce-context-switcher';
import { CommerceContextSwitcher } from './commerce-context-switcher';
import { useStorefrontContext } from './storefront-context';

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

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
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );
  const visibleStatus = hydrated ? status : 'resolving';
  const visibleMarket = hydrated ? market : null;
  const visiblePendingMarket = hydrated ? pendingMarket : null;
  const visibleIssue = hydrated ? issue : null;

  const liveMessage =
    visiblePendingMarket && (visibleStatus === 'resolving' || visibleStatus === 'retrying')
      ? labels.changing
      : visibleStatus === 'retrying'
        ? labels.checkingAgain
        : visibleStatus === 'resolving'
          ? labels.checking
          : '';

  return (
    <>
      <CommerceContextSwitcher
        locale={locale}
        activeMarket={visibleMarket}
        pendingMarket={visiblePendingMarket}
        status={visibleStatus}
        issue={visibleIssue}
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
