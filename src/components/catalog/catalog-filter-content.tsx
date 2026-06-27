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
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold uppercase text-[var(--muted-foreground)]">
        {labels.category}
      </legend>
      <a
        href={filterHref(basePath, state)}
        aria-current={!state.categorySlug ? 'page' : undefined}
        className="flex min-h-10 items-center justify-between border-b border-[var(--border)] text-sm aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
      >
        {labels.allCategories}
      </a>
      {categories.map((facet) => (
        <a
          key={facet.id}
          href={filterHref(basePath, state, facet.slug)}
          aria-current={state.categorySlug === facet.slug ? 'page' : undefined}
          className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--border)] text-sm aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
        >
          <span>{facet.label}</span>
          <span className="tabular-nums text-[var(--muted-foreground)]">{facet.product_count}</span>
        </a>
      ))}
    </fieldset>
  );
}
