'use client';

import type { MarketCode } from '@/catalog/market';
import { useStorefrontContext } from '@/components/storefront-context';

type UnavailableMarketProps = {
  market: MarketCode;
  title: string;
  description: string;
  switchLabel: string;
  pendingLabel: string;
  failureLabel: string;
  retryLabel: string;
};

export function UnavailableMarket({
  market,
  title,
  description,
  switchLabel,
  pendingLabel,
  failureLabel,
  retryLabel
}: UnavailableMarketProps) {
  const context = useStorefrontContext();
  const nextMarket: MarketCode = market === 'vn' ? 'intl' : 'vn';
  const isPending =
    context.pendingMarket === nextMarket &&
    (context.status === 'resolving' || context.status === 'retrying');
  const hasFailure = context.issue?.code === 'market_mutation_failed';

  function requestMarketChange() {
    void context.requestMarketChange(nextMarket);
  }

  return (
    <section
      aria-busy={isPending}
      className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950"
    >
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6">{description}</p>
      <button
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-amber-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={requestMarketChange}
        type="button"
      >
        {isPending ? pendingLabel : switchLabel}
      </button>
      {hasFailure ? (
        <div className="mt-4" role="alert">
          <p className="text-sm font-medium">{failureLabel}</p>
          <button
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-amber-900 px-4 py-2 text-sm font-semibold transition hover:bg-amber-100"
            onClick={requestMarketChange}
            type="button"
          >
            {retryLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
