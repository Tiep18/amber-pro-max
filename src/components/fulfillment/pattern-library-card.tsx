import { Download, FileText, LockKeyhole } from 'lucide-react';
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
    <article className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]">
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
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--muted-foreground)]">
          <span className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3">
            {labels.purchases}: {pattern.purchaseCount}
          </span>
          <span className="inline-flex min-h-8 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3">
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
          <Button type="submit" className="min-h-10 w-full gap-2 px-3 text-sm shadow-[0_10px_24px_rgba(150,73,50,0.14)] sm:w-auto">
            <Download aria-hidden="true" className="size-4" />
            {labels.download}
          </Button>
        </form>
      ) : (
        <p className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--destructive-surface)] px-3 text-sm font-semibold text-[var(--destructive)] sm:justify-self-end">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          {labels.inactive}
        </p>
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
