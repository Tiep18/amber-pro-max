'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Globe2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { MarketCode } from '@/catalog/market';
import { useLocalizedRouteSlugs } from '@/components/localized-route-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SheetClose } from '@/components/ui/sheet';
import { getLocaleSwitchHref, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type {
  StorefrontContextIssueCode,
  StorefrontContextStatus
} from '@/storefront/context-lifecycle';

export type CommerceContextLabels = {
  trigger: string;
  language: string;
  shoppingRegion: string;
  helper: string;
  changing: string;
  failure: string;
  contextFailure: string;
  retry: string;
  languages: Record<Locale, string>;
  markets: Record<MarketCode, string>;
  marketShort: Record<MarketCode, string>;
};

type CommerceContextSwitcherProps = {
  locale: Locale;
  activeMarket: MarketCode | null;
  pendingMarket: MarketCode | null;
  status: StorefrontContextStatus;
  issue: { code: StorefrontContextIssueCode } | null;
  labels: CommerceContextLabels;
  requestMarketChange: (market: MarketCode) => Promise<boolean>;
  retryContext: () => Promise<void>;
  mode?: 'desktop' | 'mobile';
  className?: string;
};

const localeOptions: Locale[] = ['vi', 'en'];
const marketOptions: MarketCode[] = ['vn', 'intl'];

function OptionCheck({ active }: { active: boolean }) {
  return active ? (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
      <Check className="size-3.5" aria-hidden="true" />
    </span>
  ) : (
    <span className="size-6 shrink-0" aria-hidden="true" />
  );
}

export function CommerceContextSwitcher({
  locale,
  activeMarket,
  pendingMarket,
  status,
  issue,
  labels,
  requestMarketChange,
  retryContext,
  mode = 'desktop',
  className
}: CommerceContextSwitcherProps) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const localizedSlugs = useLocalizedRouteSlugs(pathname);
  const [open, setOpen] = useState(false);
  const closeOnReadyRef = useRef(false);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const marketBusy = pendingMarket !== null && (status === 'resolving' || status === 'retrying');
  const contextBusy = status === 'resolving' || status === 'retrying';
  const marketFailure = issue?.code === 'market_mutation_failed';

  useEffect(() => {
    if (!closeOnReadyRef.current || status !== 'ready') return;
    closeOnReadyRef.current = false;
    setOpen(false);
    mobileCloseRef.current?.click();
  }, [status]);

  function localizedHref(targetLocale: Locale) {
    return getLocaleSwitchHref(pathname, targetLocale, searchParams, localizedSlugs);
  }

  async function changeMarket(targetMarket: MarketCode) {
    if (targetMarket === activeMarket || contextBusy) return;

    closeOnReadyRef.current = true;
    setOpen(true);
    const committed = await requestMarketChange(targetMarket);
    if (!committed) {
      closeOnReadyRef.current = false;
      setOpen(true);
    }
  }

  async function retry() {
    closeOnReadyRef.current = pendingMarket !== null;
    if (pendingMarket) {
      const committed = await requestMarketChange(pendingMarket);
      if (!committed) {
        closeOnReadyRef.current = false;
      }
      return;
    }
    await retryContext();
  }

  const triggerSummary = `${locale.toUpperCase()} · ${
    activeMarket ? labels.marketShort[activeMarket] : '—'
  }`;
  const triggerName = activeMarket
    ? `${labels.language}: ${labels.languages[locale]}. ${labels.shoppingRegion}: ${labels.markets[activeMarket]}.`
    : `${labels.language}: ${labels.languages[locale]}. ${labels.shoppingRegion}: ${labels.trigger}.`;

  function localeChoice(optionLocale: Locale, desktop = false) {
    const active = optionLocale === locale;
    return (
      <Link
        key={optionLocale}
        href={localizedHref(optionLocale)}
        hrefLang={optionLocale}
        lang={optionLocale}
        role={desktop ? 'menuitemradio' : undefined}
        aria-checked={desktop ? active : undefined}
        aria-current={!desktop && active ? 'page' : undefined}
        onClick={() => {
          closeOnReadyRef.current = false;
          setOpen(false);
        }}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-base font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
          active
            ? 'bg-[var(--surface-muted)] text-[var(--accent)]'
            : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]/60'
        )}
      >
        <span>{labels.languages[optionLocale]}</span>
        <OptionCheck active={active} />
      </Link>
    );
  }

  const mobileLocaleChoices = localeOptions.map((optionLocale) => localeChoice(optionLocale));

  function marketChoice(optionMarket: MarketCode, desktop = false) {
    const active = optionMarket === activeMarket;
    const attempted = optionMarket === pendingMarket && marketBusy;
    const content = (
      <>
        <span>{labels.markets[optionMarket]}</span>
        {attempted ? (
          <RefreshCw className="size-4 animate-spin text-[var(--warning)]" aria-hidden="true" />
        ) : (
          <OptionCheck active={active} />
        )}
      </>
    );
    const className = cn(
      'flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-base font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-70',
      active
        ? 'bg-[var(--surface-muted)] text-[var(--accent)]'
        : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]/60'
    );

    if (desktop) {
      return (
        <DropdownMenuRadioItem
          key={optionMarket}
          value={optionMarket}
          aria-busy={attempted || undefined}
          disabled={contextBusy || activeMarket === null || status === 'error'}
          onSelect={(event) => {
            event.preventDefault();
            void changeMarket(optionMarket);
          }}
          className={cn(className, 'pl-3')}
        >
          {content}
        </DropdownMenuRadioItem>
      );
    }

    return (
      <button
        key={optionMarket}
        type="button"
        role="radio"
        aria-checked={active}
        aria-busy={attempted || undefined}
        disabled={contextBusy || activeMarket === null || status === 'error'}
        onClick={() => void changeMarket(optionMarket)}
        className={className}
      >
        {content}
      </button>
    );
  }

  const mobileMarketChoices = marketOptions.map((optionMarket) => marketChoice(optionMarket));

  const feedback = marketBusy ? (
    <p
      className="flex items-center gap-2 text-sm font-normal text-[var(--warning)]"
      aria-hidden="true"
    >
      <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
      {labels.changing}
    </p>
  ) : issue ? (
    <div
      role="alert"
      className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--destructive)] bg-[var(--destructive-surface)] p-3 text-sm font-normal text-[var(--destructive)]"
    >
      <p className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{marketFailure ? labels.failure : labels.contextFailure}</span>
      </p>
      <button
        type="button"
        onClick={() => void retry()}
        className="min-h-11 justify-self-start rounded-[var(--radius-control)] px-2 font-semibold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {labels.retry}
      </button>
    </div>
  ) : null;

  if (mode === 'mobile') {
    return (
      <div className={cn('grid gap-4', className)}>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">{labels.language}</legend>
          <div className="grid grid-cols-2 gap-2">{mobileLocaleChoices}</div>
        </fieldset>
        <fieldset className="grid gap-2" aria-busy={marketBusy || undefined}>
          <legend className="mb-1 text-sm font-semibold">{labels.shoppingRegion}</legend>
          <div role="radiogroup" aria-label={labels.shoppingRegion} className="grid gap-2">
            {mobileMarketChoices}
          </div>
        </fieldset>
        <p className="text-sm font-normal leading-5 text-[var(--muted-foreground)]">
          {labels.helper}
        </p>
        {feedback}
        <SheetClose asChild>
          <button ref={mobileCloseRef} type="button" className="hidden" tabIndex={-1}>
            {labels.trigger}
          </button>
        </SheetClose>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={(nextOpen) => !marketBusy && setOpen(nextOpen)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="commerce-context-trigger"
          aria-label={triggerName}
          aria-busy={contextBusy || undefined}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-transparent bg-transparent px-3 text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:-translate-y-px hover:border-[var(--border)] hover:bg-[var(--surface)]/70 active:translate-y-0',
            className
          )}
        >
          <Globe2 className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          <span className="min-w-[4.75rem] whitespace-nowrap text-center">{triggerSummary}</span>
          <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[320px] rounded-[var(--radius-card)] border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-2 text-sm font-semibold">
          {labels.language}
        </DropdownMenuLabel>
        <DropdownMenuGroup role="group" aria-label={labels.language} className="grid gap-1">
          {localeOptions.map((optionLocale) => (
            <DropdownMenuItem key={optionLocale} asChild className="min-h-11 p-0 pl-0">
              {localeChoice(optionLocale, true)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel className="px-2 py-2 text-sm font-semibold">
          {labels.shoppingRegion}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeMarket ?? ''}
          aria-label={labels.shoppingRegion}
          aria-busy={marketBusy || undefined}
          className="grid gap-1"
        >
          {marketOptions.map((optionMarket) => marketChoice(optionMarket, true))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="my-2" />
        <p className="px-2 py-1 text-sm font-normal leading-5 text-[var(--muted-foreground)]">
          {labels.helper}
        </p>
        {feedback ? <div className="px-2 pb-1 pt-2">{feedback}</div> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
