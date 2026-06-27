import { Download, FileText } from 'lucide-react';
import type { CustomerPatternLibraryItem } from '@/fulfillment/account-queries';
import { Button } from '@/components/ui/button';
import { formatAdminDate } from '@/components/admin/orders/format';

type Labels = {
  purchases: string;
  latest: string;
  download: string;
  inactive: string;
};

export function PatternLibraryCard({
  pattern,
  labels
}: {
  pattern: CustomerPatternLibraryItem;
  labels: Labels;
}) {
  return (
    <article className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 shadow-sm sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
        <FileText className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-semibold">{pattern.title}</h2>
          <span
            className={
              pattern.active
                ? 'rounded-full border border-[var(--success)] bg-[var(--success-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]'
                : 'rounded-full border border-[var(--destructive)] bg-[var(--destructive-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--destructive)]'
            }
          >
            {pattern.active ? labels.download : labels.inactive}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <span>
            {labels.purchases}: {pattern.purchaseCount}
          </span>
          <span>
            {labels.latest}: {formatAdminDate(pattern.latestPurchaseAt)}
          </span>
        </div>
      </div>
      {pattern.active ? (
        <form
          action={`/api/downloads?orderNumber=${encodeURIComponent(pattern.latestOrderNumber)}&productId=${encodeURIComponent(pattern.productId)}`}
          method="post"
        >
          <Button type="submit" className="w-full gap-2 sm:w-auto">
            <Download aria-hidden="true" className="size-4" />
            {labels.download}
          </Button>
        </form>
      ) : (
        <p className="text-sm font-semibold text-[var(--destructive)]">{labels.inactive}</p>
      )}
    </article>
  );
}
