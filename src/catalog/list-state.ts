import type {CatalogProductType, CatalogSort} from './queries';

const catalogSorts: readonly CatalogSort[] = [
  'newest',
  'price_asc',
  'price_desc',
  'title'
];

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type CatalogListState = {
  search?: string;
  productType?: CatalogProductType;
  categorySlug?: string;
  techniqueSlug?: string;
  tagSlug?: string;
  sort: CatalogSort;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 100) : undefined;
}

export function catalogListState(query: CatalogSearchParams): CatalogListState {
  const requestedType = first(query.type);
  const requestedSort = first(query.sort);

  return {
    search: clean(first(query.search)),
    productType:
      requestedType === 'pdf_pattern' || requestedType === 'physical_finished'
        ? requestedType
        : undefined,
    categorySlug: clean(first(query.category)),
    techniqueSlug: clean(first(query.technique)),
    tagSlug: clean(first(query.tag)),
    sort: catalogSorts.includes(requestedSort as CatalogSort)
      ? (requestedSort as CatalogSort)
      : 'newest'
  };
}

export function catalogListStateFromSearchParams(
  searchParams: Pick<URLSearchParams, 'getAll'>
): CatalogListState {
  const firstValue = (key: string) => searchParams.getAll(key)[0];

  return catalogListState({
    search: firstValue('search'),
    type: firstValue('type'),
    category: firstValue('category'),
    technique: firstValue('technique'),
    tag: firstValue('tag'),
    sort: firstValue('sort')
  });
}

export function hasCatalogFilters(state: CatalogListState) {
  return Boolean(
    state.search ||
      state.productType ||
      state.categorySlug ||
      state.techniqueSlug ||
      state.tagSlug ||
      state.sort !== 'newest'
  );
}
