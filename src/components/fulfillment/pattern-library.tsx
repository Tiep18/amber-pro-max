import { ScrollText } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            {patterns.length}{' '}
            {locale === 'vi' ? 'pattern' : patterns.length === 1 ? 'pattern' : 'patterns'}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <AccountEmptyState
            icon={<ScrollText className="h-6 w-6" aria-hidden="true" />}
            title={t.emptyTitle}
            body={labels.empty || t.emptyBody}
            cta={{
              href:
                locale === 'vi' ? '/vi/cua-hang?type=pdf_pattern' : '/en/catalog?type=pdf_pattern',
              label: t.cta
            }}
          />
        ) : (
          <div className="grid gap-4">
            {patterns.map((pattern) => (
              <PatternLibraryCard key={pattern.productId} pattern={pattern} labels={labels} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
