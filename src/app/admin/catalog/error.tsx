'use client';

import Link from 'next/link';
import {useEffect} from 'react';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

export default function CatalogAdminError({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Catalog admin route failed to load', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Alert variant="destructive">
        <AlertTitle>Catalog data could not be loaded</AlertTitle>
        <p className="mt-2">
          Nothing was changed. Retry the load before editing or saving this product.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={reset}>Retry</Button>
          <Link
            href="/admin/catalog"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
          >
            Return to catalog
          </Link>
        </div>
      </Alert>
    </main>
  );
}
