'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ChevronLeft, ChevronRight, Search, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {cn} from '@/lib/utils';

type CatalogListControlsProps = {
  search: string;
  status: string;
  type: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  stats: {
    total: number;
    published: number;
    draftOrHidden: number;
  };
};

const statusOptions = [
  {value: 'all', label: 'All status'},
  {value: 'published', label: 'Published'},
  {value: 'draft', label: 'Draft'},
  {value: 'archived', label: 'Archived'}
];

const typeOptions = [
  {value: 'all', label: 'All types'},
  {value: 'pdf_pattern', label: 'PDF pattern'},
  {value: 'physical_finished', label: 'Handmade'}
];

function paramHref(pathname: string, currentParams: URLSearchParams, patch: Record<string, string | number | null>) {
  const params = new URLSearchParams(currentParams.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function PageLink({
  children,
  href,
  disabled,
  label
}: {
  children: ReactNode;
  href: string;
  disabled: boolean;
  label: string;
}) {
  return (
    <Link
      href={disabled ? '#' : href}
      aria-disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]',
        disabled && 'pointer-events-none opacity-45'
      )}
    >
      {children}
    </Link>
  );
}

export function CatalogListControls({
  search,
  status,
  type,
  page,
  totalPages,
  total,
  pageSize,
  stats
}: CatalogListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  function updateFilter(key: 'status' | 'type', value: string) {
    router.replace(paramHref(pathname, searchParams, {[key]: value, page: null}));
  }

  return (
    <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--foreground)]">Catalog</span>
          <span className="rounded-[var(--radius-control)] bg-[#f3eee7] px-2.5 py-1 text-xs font-semibold text-[#6b4a35]">
            {stats.total} total
          </span>
          <span className="rounded-[var(--radius-control)] bg-[var(--success-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
            {stats.published} published
          </span>
          <span className="rounded-[var(--radius-control)] bg-[var(--warning-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--warning)]">
            {stats.draftOrHidden} draft or hidden
          </span>
        </div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
          {firstItem}-{lastItem} of {total}
        </p>
      </div>
      <form
        className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const nextSearch = String(formData.get('search') ?? '').trim();
          router.replace(paramHref(pathname, searchParams, {search: nextSearch, page: null}));
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search catalog products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search product, type, status"
            className="min-h-10 pl-9 text-sm"
          />
        </label>
        <Select value={status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(value) => updateFilter('type', value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="min-h-10 px-3 text-sm">
            Search
          </Button>
          {search || status !== 'all' || type !== 'all' ? (
            <Link
              href={pathname}
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
              aria-label="Clear catalog filters"
            >
              <X className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </form>

      <div className="flex justify-end text-sm text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <PageLink
            href={paramHref(pathname, searchParams, {page: page - 1})}
            disabled={page <= 1}
            label="Previous catalog page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </PageLink>
          <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
            {page} / {totalPages}
          </span>
          <PageLink
            href={paramHref(pathname, searchParams, {page: page + 1})}
            disabled={page >= totalPages}
            label="Next catalog page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </PageLink>
        </div>
      </div>
    </div>
  );
}
