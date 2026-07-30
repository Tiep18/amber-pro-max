'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import type { CatalogSort } from '@/catalog/queries';
import type { CatalogListState } from '@/catalog/list-state';
import { CatalogSortSelect } from '@/components/catalog/catalog-sort-select';

type CatalogControlLabels = {
  search: string;
  searchPlaceholder: string;
  searchSubmit: string;
  sort: string;
  newest: string;
  priceAsc: string;
  priceDesc: string;
  titleSort: string;
};

function SearchSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--accent)] transition duration-200 hover:bg-[var(--surface-blush)] hover:text-[var(--accent-hover)] disabled:opacity-60"
      aria-label={label}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Search aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

export function CatalogControlsClient({
  state,
  labels
}: {
  state: CatalogListState;
  labels: CatalogControlLabels;
}) {
  const [searchValue, setSearchValue] = useState(state.search ?? '');
  const sortOptions: Array<{ value: CatalogSort; label: string }> = [
    { value: 'newest', label: labels.newest },
    { value: 'price_asc', label: labels.priceAsc },
    { value: 'price_desc', label: labels.priceDesc },
    { value: 'title', label: labels.titleSort }
  ];

  useEffect(() => {
    setSearchValue(state.search ?? '');
  }, [state.search]);

  function cleanEmptySearch(event: FormEvent<HTMLFormElement>) {
    const search = event.currentTarget.elements.namedItem('search');
    if (!(search instanceof HTMLInputElement)) return;

    const cleaned = search.value.trim();
    if (!cleaned) {
      search.disabled = true;
      window.setTimeout(() => {
        search.disabled = false;
      }, 0);
      return;
    }

    search.value = cleaned;
    setSearchValue(cleaned);
  }

  return (
    <form
      method="get"
      onSubmit={cleanEmptySearch}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(92px,108px)] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)] sm:gap-3"
    >
      {state.productType ? <input type="hidden" name="type" value={state.productType} /> : null}
      {state.categorySlug ? (
        <input type="hidden" name="category" value={state.categorySlug} />
      ) : null}
      {state.techniqueSlug ? (
        <input type="hidden" name="technique" value={state.techniqueSlug} />
      ) : null}
      {state.tagSlug ? <input type="hidden" name="tag" value={state.tagSlug} /> : null}
      <label className="grid min-w-0 gap-1 text-sm font-semibold">
        <span className="sr-only sm:not-sr-only">{labels.search}</span>
        <span className="flex min-h-10 min-w-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-3 pr-1 shadow-[inset_0_1px_0_rgb(255_255_255/55%)] transition-colors hover:bg-[var(--surface-paper)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] sm:min-h-11 sm:rounded-[var(--radius-control)]">
          <input
            type="search"
            name="search"
            autoComplete="off"
            spellCheck={false}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm font-normal outline-none placeholder:text-[var(--muted-foreground)]/72 sm:text-base"
          />
          <SearchSubmitButton label={labels.searchSubmit} />
        </span>
      </label>
      <CatalogSortSelect name="sort" label={labels.sort} value={state.sort} options={sortOptions} />
    </form>
  );
}
