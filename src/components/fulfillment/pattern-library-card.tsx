import { Download, FileText } from 'lucide-react';
import type { CustomerPatternLibraryItem } from '@/fulfillment/account-queries';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/routing';

type Labels = {
  purchases: string;
  latest: string;
  download: string;
  inactive: string;
};

export function PatternLibraryCard({
  pattern,
  labels,
  locale
}: {
  pattern: CustomerPatternLibraryItem;
  labels: Labels;
  locale: Locale;
}) {
  const latestPurchaseLabel = formatCustomerDate(pattern.latestPurchaseAt, locale);

  return (
    <article className="grid gap-4 border-b border-[var(--border)] py-5 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-lg font-semibold leading-tight sm:truncate">{pattern.title}</h2>
          <span
            className={
              pattern.active
                ? 'rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-surface)] px-2 py-1 text-xs font-semibold text-[var(--success)]'
                : 'rounded-[var(--radius-control)] border border-[var(--destructive)] bg-[var(--destructive-surface)] px-2 py-1 text-xs font-semibold text-[var(--destructive)]'
            }
          >
            {pattern.active ? labels.download : labels.inactive}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <span>
            {labels.purchases}: {pattern.purchaseCount}
          </span>
          <span>
            {labels.latest}: {latestPurchaseLabel}
          </span>
        </div>
      </div>
      {pattern.active ? (
        <form
          action={`/api/downloads?orderNumber=${encodeURIComponent(pattern.latestOrderNumber)}&productId=${encodeURIComponent(pattern.productId)}`}
          method="post"
          className="sm:justify-self-end"
        >
          <Button type="submit" className="min-h-10 w-full gap-2 px-3 text-sm sm:w-auto">
            <Download aria-hidden="true" className="size-4" />
            {labels.download}
          </Button>
        </form>
      ) : (
        <p className="text-sm font-semibold text-[var(--destructive)] sm:justify-self-end">{labels.inactive}</p>
      )}
    </article>
  );
}

function formatCustomerDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === 'vi' ? 'Chua cap nhat' : 'Not updated yet';
  }
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}
