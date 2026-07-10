import { BookOpenCheck, ScrollText } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import type { CustomerPatternLibraryItem } from '@/fulfillment/account-queries';
import type { Locale } from '@/i18n/routing';
import { PatternLibraryCard } from './pattern-library-card';

type Labels = {
  title: string;
  empty: string;
  purchases: string;
  latest: string;
  download: string;
  inactive: string;
};

const copy = {
  en: {
    emptyTitle: 'No PDF patterns yet',
    emptyBody: 'Paid PDF patterns appear here after payment is confirmed.',
    cta: 'Browse PDF patterns',
    eyebrow: 'Private PDF access',
    latest: 'Latest purchase'
  },
  vi: {
    emptyTitle: 'Ban chua mua pattern nao',
    emptyBody: 'Pattern PDF da thanh toan se hien tai day sau khi don duoc xac nhan.',
    cta: 'Xem pattern PDF',
    eyebrow: 'Quyen truy cap PDF rieng',
    latest: 'Lan mua moi nhat'
  }
} as const;

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

export function PatternLibrary({
  patterns,
  labels,
  locale
}: {
  patterns: CustomerPatternLibraryItem[];
  labels: Labels;
  locale: Locale;
}) {
  const t = copy[locale];
  const latestPattern = patterns[0] ?? null;

  return (
    <section className="grid gap-5">
      <header className="grid gap-4 border-b border-[var(--border)] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="text-[30px] font-semibold leading-tight sm:text-[34px]">{labels.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)] sm:justify-end">
          <span className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 font-semibold text-[var(--foreground)]">
            {patterns.length} {locale === 'vi' ? 'pattern' : patterns.length === 1 ? 'pattern' : 'patterns'}
          </span>
          {latestPattern ? (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t.latest}: {formatCustomerDate(latestPattern.latestPurchaseAt, locale)}
            </span>
          ) : null}
        </div>
      </header>

      {patterns.length === 0 ? (
        <AccountEmptyState
          icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
          title={t.emptyTitle}
          body={labels.empty || t.emptyBody}
          cta={{
            href: locale === 'vi' ? '/vi/cua-hang?type=pdf_pattern' : '/en/catalog?type=pdf_pattern',
            label: t.cta
          }}
        />
      ) : (
        <div className="grid gap-3">
          {patterns.map((pattern) => (
            <PatternLibraryCard
              key={pattern.productId}
              pattern={pattern}
              labels={labels}
              locale={locale}
            />
          ))}
        </div>
      )}
    </section>
  );
}
