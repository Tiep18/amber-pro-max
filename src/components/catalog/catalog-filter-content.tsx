import Link from 'next/link';
import type {CatalogFacet} from '@/catalog/queries';
import type {CatalogListState} from '@/catalog/list-state';

type FacetKind = 'category' | 'technique' | 'tag';

export type CatalogFilterLabels = {
  category: string;
  allCategories: string;
  technique?: string;
  allTechniques?: string;
  tag?: string;
  allTags?: string;
};

function filterHref(
  basePath: string,
  state: CatalogListState,
  change?: {kind: FacetKind; slug?: string}
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
  allLabel
}: {
  basePath: string;
  state: CatalogListState;
  kind: FacetKind;
  facets: CatalogFacet[];
  label: string;
  allLabel: string;
}) {
  const selected =
    kind === 'category'
      ? state.categorySlug
      : kind === 'technique'
        ? state.techniqueSlug
        : state.tagSlug;

  return (
    <fieldset className="grid gap-1">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        {label}
      </legend>
      <Link
        href={filterHref(basePath, state, {kind})}
        aria-current={!selected ? 'page' : undefined}
        transitionTypes={!selected ? undefined : ['catalog-filter']}
        className="relative flex min-h-11 items-center justify-between border-l-2 border-transparent px-3 text-sm text-[var(--muted-foreground)] transition duration-200 hover:text-[var(--foreground)] aria-[current=page]:border-[var(--accent)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
      >
        {allLabel}
      </Link>
      {facets.map((facet) => (
        <Link
          key={facet.id}
          href={filterHref(basePath, state, {kind, slug: facet.slug})}
          aria-current={selected === facet.slug ? 'page' : undefined}
          transitionTypes={selected === facet.slug ? undefined : ['catalog-filter']}
          className="relative flex min-h-11 items-center justify-between gap-3 border-l-2 border-transparent px-3 text-sm text-[var(--muted-foreground)] transition duration-200 hover:text-[var(--foreground)] aria-[current=page]:border-[var(--accent)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]"
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
    <div className="grid gap-6">
      <FacetGroup
        basePath={basePath}
        state={state}
        kind="category"
        facets={categories}
        label={labels.category}
        allLabel={labels.allCategories}
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
