'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import type { CatalogFacet } from '@/catalog/queries';
import type { CatalogListState } from '@/catalog/list-state';
import { cn } from '@/lib/utils';

type FacetKind = 'category' | 'technique' | 'tag';

export type CatalogFilterLabels = {
  category: string;
  allCategories: string;
  technique?: string;
  allTechniques?: string;
  tag?: string;
  allTags?: string;
  searchCategories?: string;
  noMatchingCategories?: string;
};

function filterHref(
  basePath: string,
  state: CatalogListState,
  change?: { kind: FacetKind; slug?: string }
) {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.productType) params.set('type', state.productType);
  if (state.sort !== 'newest') params.set('sort', state.sort);
  const category = change?.kind === 'category' ? change.slug : state.categorySlug;
  const technique = change?.kind === 'technique' ? change.slug : state.techniqueSlug;
  const tag = change?.kind === 'tag' ? change.slug : state.tagSlug;
  if (category) params.set('category', category);
  if (technique) params.set('technique', technique);
  if (tag) params.set('tag', tag);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function FacetGroup({
  basePath,
  state,
  kind,
  facets,
  label,
  allLabel,
  localSearchLabel,
  noMatchesLabel
}: {
  basePath: string;
  state: CatalogListState;
  kind: FacetKind;
  facets: CatalogFacet[];
  label: string;
  allLabel: string;
  localSearchLabel?: string;
  noMatchesLabel?: string;
}) {
  const selected =
    kind === 'category'
      ? state.categorySlug
      : kind === 'technique'
        ? state.techniqueSlug
        : state.tagSlug;
  const contentId = useId();
  const [localSearch, setLocalSearch] = useState('');
  const [expanded, setExpanded] = useState(kind === 'category' || Boolean(selected));
  const showLocalSearch = Boolean(localSearchLabel && facets.length > 10);
  const visibleFacets = useMemo(() => {
    const query = localSearch.trim().toLocaleLowerCase();
    const matchingFacets = query
      ? facets.filter(
          (facet) => facet.slug === selected || facet.label.toLocaleLowerCase().includes(query)
        )
      : facets;
    return [...matchingFacets].sort((left, right) => {
      if (left.slug === selected) return -1;
      if (right.slug === selected) return 1;
      return 0;
    });
  }, [facets, localSearch, selected]);

  useEffect(() => {
    if (selected) setExpanded(true);
  }, [selected]);

  return (
    <section className="border-b border-[var(--border)]/65 pb-3 last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left transition-colors hover:bg-[var(--surface-muted)]/48 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]">
            {label}
          </span>
          <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--muted-foreground)]">
            {facets.length}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expanded ? (
        <div id={contentId} role="group" aria-label={label} className="mt-1 grid gap-1">
          {showLocalSearch ? (
            <label className="mb-2 grid gap-1 px-1">
              <span className="sr-only">{localSearchLabel}</span>
              <input
                type="search"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={localSearchLabel}
                className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition-colors placeholder:text-[var(--muted-foreground)]/72 hover:bg-[var(--surface-paper)] focus-visible:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              />
            </label>
          ) : null}
          <Link
            href={filterHref(basePath, state, { kind })}
            aria-current={!selected ? 'page' : undefined}
            transitionTypes={!selected ? undefined : ['catalog-filter']}
            className={cn(
              'relative flex min-h-11 items-center justify-between rounded-[var(--radius-control)] px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]',
              !selected
                ? 'bg-[var(--accent-soft,var(--surface-blush))] font-semibold text-[var(--accent)] shadow-[inset_3px_0_0_var(--accent)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]'
            )}
          >
            {allLabel}
          </Link>
          {visibleFacets.map((facet) => {
            const active = selected === facet.slug;
            const unavailable = facet.product_count === 0 && !active;
            const content = (
              <>
                <span data-facet-label="true" className="min-w-0 break-words">
                  {facet.label}
                </span>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    active ? 'text-[var(--accent)]/75' : 'text-[var(--muted-foreground)]/80'
                  )}
                >
                  {facet.product_count}
                </span>
              </>
            );
            const className =
              'relative flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]';

            return unavailable ? (
              <span
                key={facet.id}
                aria-disabled="true"
                className={`${className} cursor-not-allowed opacity-45`}
              >
                {content}
              </span>
            ) : (
              <Link
                key={facet.id}
                href={filterHref(basePath, state, { kind, slug: facet.slug })}
                aria-current={active ? 'page' : undefined}
                transitionTypes={active ? undefined : ['catalog-filter']}
                className={cn(
                  className,
                  active
                    ? 'bg-[var(--accent-soft,var(--surface-blush))] font-semibold text-[var(--accent)] shadow-[inset_3px_0_0_var(--accent)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]'
                )}
              >
                {content}
              </Link>
            );
          })}
          {showLocalSearch && visibleFacets.length === 0 && noMatchesLabel ? (
            <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">{noMatchesLabel}</p>
          ) : null}
        </div>
      ) : selected ? (
        <p className="truncate px-2 pb-1 text-xs font-semibold text-[var(--accent)]">
          {facets.find((facet) => facet.slug === selected)?.label}
        </p>
      ) : null}
    </section>
  );
}

export function CatalogFilterContent({
  basePath,
  state,
  categories,
  techniques = [],
  tags = [],
  labels
}: {
  basePath: string;
  state: CatalogListState;
  categories: CatalogFacet[];
  techniques?: CatalogFacet[];
  tags?: CatalogFacet[];
  labels: CatalogFilterLabels;
}) {
  return (
    <div className="grid gap-3">
      <FacetGroup
        basePath={basePath}
        state={state}
        kind="category"
        facets={categories}
        label={labels.category}
        allLabel={labels.allCategories}
        localSearchLabel={labels.searchCategories}
        noMatchesLabel={labels.noMatchingCategories}
      />
      {labels.technique && labels.allTechniques ? (
        <FacetGroup
          basePath={basePath}
          state={state}
          kind="technique"
          facets={techniques}
          label={labels.technique}
          allLabel={labels.allTechniques}
        />
      ) : null}
      {labels.tag && labels.allTags ? (
        <FacetGroup
          basePath={basePath}
          state={state}
          kind="tag"
          facets={tags}
          label={labels.tag}
          allLabel={labels.allTags}
        />
      ) : null}
    </div>
  );
}
