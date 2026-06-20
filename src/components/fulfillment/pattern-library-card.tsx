import {Download} from 'lucide-react';
import type {CustomerPatternLibraryItem} from '@/fulfillment/account-queries';
import {Button} from '@/components/ui/button';
import {formatAdminDate} from '@/components/admin/orders/format';

type Labels = {
  purchases: string;
  latest: string;
  download: string;
  inactive: string;
};

export function PatternLibraryCard({pattern, labels}: {pattern: CustomerPatternLibraryItem; labels: Labels}) {
  return (
    <article className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[1fr_auto]">
      <div>
        <h2 className="text-lg font-semibold">{pattern.title}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.purchases}: {pattern.purchaseCount}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.latest}: {formatAdminDate(pattern.latestPurchaseAt)}</p>
      </div>
      {pattern.active ? (
        <form action={`/api/downloads?orderNumber=${encodeURIComponent(pattern.latestOrderNumber)}`} method="post">
          <Button type="submit" className="gap-2">
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
