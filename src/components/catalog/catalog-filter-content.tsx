import Link from 'next/link';
import type {CatalogFacet} from '@/catalog/queries';
import type {CatalogListState} from '@/catalog/list-state';

function filterHref(basePath: string, state: CatalogListState, category?: string) {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.productType) params.set('type', state.productType);
  if (state.sort !== 'newest') params.set('sort', state.sort);
  if (category) params.set('category', category);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function CatalogFilterContent({
  basePath,
  state,
  categories,
  labels
}: {
  basePath: string;
  state: CatalogListState;
  categories: CatalogFacet[];
  labels: {category: string; allCategories: string};
}) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        {labels.category}
      </legend>
      <Link
        href={filterHref(basePath, state)}
        aria-current={!state.categorySlug ? 'page' : undefined}
        transitionTypes={!state.categorySlug ? undefined : ['catalog-filter']}
        className="relative flex min-h-10 items-center justify-between border-l-2 border-transparent px-3 text-sm text-[var(--muted-foreground)] transition duration-200 hover:text-[var(--foreground)] aria-[current=page]:border-[var(--accent)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
      >
        {labels.allCategories}
      </Link>
      {categories.map((facet) => (
        <Link
          key={facet.id}
          href={filterHref(basePath, state, facet.slug)}
          aria-current={state.categorySlug === facet.slug ? 'page' : undefined}
          transitionTypes={state.categorySlug === facet.slug ? undefined : ['catalog-filter']}
          className="relative flex min-h-10 items-center justify-between gap-3 border-l-2 border-transparent px-3 text-sm text-[var(--muted-foreground)] transition duration-200 hover:text-[var(--foreground)] aria-[current=page]:border-[var(--accent)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
        >
          <span className="min-w-0 break-words">{facet.label}</span>
          <span className="text-xs tabular-nums text-[var(--muted-foreground)]/80">
            {facet.product_count}
          </span>
        </Link>
      ))}
    </fieldset>
  );
}
