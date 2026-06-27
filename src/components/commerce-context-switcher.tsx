'use client';

import { useTransition } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { setActiveMarketAction } from '@/catalog/market-actions';
import type { MarketCode } from '@/catalog/market';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getEquivalentLocalizedPath, isLocale, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type CommerceContextLabels = {
  label: string;
  current: string;
  options: {
    vn: string;
    intl: string;
  };
};

type CommerceOption = {
  market: MarketCode;
  locale: Locale;
  short: string;
  detail: string;
};

const options: CommerceOption[] = [
  { market: 'vn', locale: 'vi', short: 'VN / VI', detail: 'Vietnam market, Vietnamese' },
  { market: 'intl', locale: 'en', short: 'INTL / EN', detail: 'International market, English' }
];

const safeQueryKeys = new Set(['next']);

function safeQuery(searchParams: URLSearchParams) {
  const next = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (safeQueryKeys.has(key) && value.startsWith('/') && !value.startsWith('//')) {
      next.set(key, value);
    }
  }
  const query = next.toString();
  return query ? `?${query}` : '';
}

export function CommerceContextSwitcher({
  locale,
  activeMarket,
  labels,
  className
}: {
  locale: Locale;
  activeMarket: MarketCode;
  labels: CommerceContextLabels;
  className?: string;
}) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeOption =
    options.find((option) => option.market === activeMarket && option.locale === locale) ??
    options.find((option) => option.market === activeMarket) ??
    options[0];

  function returnPathFor(targetLocale: Locale) {
    const path =
      isLocale(locale) && targetLocale !== locale
        ? getEquivalentLocalizedPath(pathname, targetLocale)
        : pathname;
    return `${path}${safeQuery(searchParams)}`;
  }

  function switchTo(option: CommerceOption) {
    const formData = new FormData();
    formData.set('market', option.market);
    formData.set('returnTo', returnPathFor(option.locale));
    startTransition(() => {
      void setActiveMarketAction(formData);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={labels.label}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-[var(--surface-muted)]',
            className
          )}
        >
          <Globe2 className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          <span className="whitespace-nowrap">{activeOption.short}</span>
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[280px] rounded-[var(--radius-card)] border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--foreground)] shadow-xl"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
          {labels.current}
        </DropdownMenuLabel>
        <DropdownMenuGroup className="grid gap-1">
          {options.map((option) => {
            const active = option.market === activeMarket && option.locale === locale;
            return (
              <DropdownMenuItem
                key={`${option.market}-${option.locale}`}
                asChild
                onSelect={(event) => {
                  event.preventDefault();
                  if (!active && !isPending) {
                    switchTo(option);
                  }
                }}
              >
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  disabled={isPending}
                  className={cn(
                    'flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2.5 text-left disabled:cursor-wait disabled:opacity-70',
                    active
                      ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                      : 'text-[var(--foreground)]'
                  )}
                >
                  <span className="grid gap-0.5">
                    <span className="text-sm font-semibold leading-5">
                      {labels.options[option.market]}
                    </span>
                    <span className="text-xs font-normal text-[var(--muted-foreground)]">
                      {option.detail}
                    </span>
                  </span>
                  {active ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
