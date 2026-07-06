'use client';

import {Children, type ReactNode, useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';

export const CATALOG_PAGE_SIZE = 12;

export function visibleCatalogCount(totalCount: number, requestedCount: number) {
  return Math.min(Math.max(requestedCount, 0), Math.max(totalCount, 0));
}

export function nextCatalogCount(currentCount: number, totalCount: number) {
  return visibleCatalogCount(totalCount, currentCount + CATALOG_PAGE_SIZE);
}

export function CatalogResultGrid({
  children,
  resultKey,
  labels
}: {
  children: ReactNode;
  resultKey: string;
  labels: {
    showing: string;
    loadMore: string;
  };
}) {
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(() =>
    visibleCatalogCount(items.length, CATALOG_PAGE_SIZE)
  );

  useEffect(() => {
    setVisibleCount(visibleCatalogCount(items.length, CATALOG_PAGE_SIZE));
  }, [items.length, resultKey]);

  const hasMore = visibleCount < items.length;

  return (
    <div className="grid gap-6">
      <p className="sr-only" aria-live="polite">
        {labels.showing.replace('{visible}', String(visibleCount)).replace('{total}', String(items.length))}
      </p>
      <section
        data-testid="catalog-product-grid"
        className="grid gap-y-6 min-[480px]:grid-cols-2 min-[480px]:gap-x-3 sm:gap-5 lg:grid-cols-3"
      >
        {items.slice(0, visibleCount)}
      </section>
      {hasMore ? (
        <div className="flex justify-center pt-2 sm:pt-3">
          <Button
            variant="secondary"
            data-testid="catalog-load-more"
            className="group/load gap-2 border-[var(--brand)]/35 bg-transparent px-5 text-sm font-semibold text-[var(--brand)] shadow-[0_6px_20px_rgb(73_52_32/6%)] hover:border-[var(--accent)]/55 hover:bg-[var(--surface-blush)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--accent)]"
            onClick={() => setVisibleCount((current) => nextCatalogCount(current, items.length))}
          >
            <Plus
              data-load-more-icon="true"
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover/load:rotate-90"
              strokeWidth={1.8}
            />
            {labels.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
