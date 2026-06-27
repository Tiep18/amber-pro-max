'use client';

import {Children, type ReactNode, useEffect, useState} from 'react';
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
        className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
      >
        {items.slice(0, visibleCount)}
      </section>
      {hasMore ? (
        <div className="flex justify-center border-t border-[var(--border)] pt-6">
          <Button
            variant="secondary"
            data-testid="catalog-load-more"
            onClick={() => setVisibleCount((current) => nextCatalogCount(current, items.length))}
          >
            {labels.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
