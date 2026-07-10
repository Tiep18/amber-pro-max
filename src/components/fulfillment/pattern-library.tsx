import { ScrollText } from 'lucide-react';
import Link from 'next/link';
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
    cta: 'Browse PDF patterns'
  },
  vi: {
    emptyTitle: 'Ban chua mua pattern nao',
    emptyBody: 'Pattern PDF da thanh toan se hien tai day sau khi don duoc xac nhan.',
    cta: 'Xem pattern PDF'
  }
} as const;

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

  return (
    <section className="grid gap-6">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-[32px] font-semibold leading-tight">{labels.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {patterns.length}{' '}
          {locale === 'vi' ? 'pattern' : patterns.length === 1 ? 'pattern' : 'patterns'}
        </p>
      </header>

      {patterns.length === 0 ? (
        <div className="grid min-h-60 place-items-center rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-8 text-center">
          <div className="mx-auto grid max-w-[380px] justify-items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
              <ScrollText className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">{t.emptyTitle}</h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {labels.empty || t.emptyBody}
            </p>
            <Link
              href={locale === 'vi' ? '/vi/cua-hang?type=pdf_pattern' : '/en/catalog?type=pdf_pattern'}
              className="mt-1 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              {t.cta}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid">
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
