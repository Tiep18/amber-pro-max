'use client';

import {usePathname} from 'next/navigation';
import {setActiveMarketAction} from '@/catalog/market-actions';
import type {MarketCode} from '@/catalog/market';
import {cn} from '@/lib/utils';

type MarketSwitcherLabels = {
  label: string;
  current: string;
  markets: Record<MarketCode, string>;
  short: Record<MarketCode, string>;
  switchTo: Record<MarketCode, string>;
};

const markets: MarketCode[] = ['vn', 'intl'];

export function MarketSwitcher({
  activeMarket,
  labels,
  className
}: {
  activeMarket: MarketCode;
  labels: MarketSwitcherLabels;
  className?: string;
}) {
  const pathname = usePathname() || '/vi';

  return (
    <nav
      aria-label={labels.label}
      className={cn(
        'inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1',
        className
      )}
    >
      <span
        aria-label={labels.current}
        data-testid="active-market-label"
        className="max-w-[5.5rem] truncate px-2 text-sm font-semibold text-[var(--foreground)]"
      >
        {labels.markets[activeMarket]}
      </span>
      <span className="flex items-center gap-1">
        {markets.map((market) => {
          const active = market === activeMarket;
          return (
            <form key={market} action={setActiveMarketAction}>
              <input type="hidden" name="market" value={market} />
              <input type="hidden" name="returnTo" value={pathname} />
              <button
                type="submit"
                aria-label={labels.switchTo[market]}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-2 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-[var(--surface-muted)] text-[var(--accent)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                {labels.short[market]}
              </button>
            </form>
          );
        })}
      </span>
    </nav>
  );
}
