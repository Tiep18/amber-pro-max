import {catalogSorts, type CatalogProductType, type CatalogSort} from './queries';

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type CatalogListState = {
  search?: string;
  productType?: CatalogProductType;
  categorySlug?: string;
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
    sort: catalogSorts.includes(requestedSort as CatalogSort)
      ? (requestedSort as CatalogSort)
      : 'newest'
  };
}

export function hasCatalogFilters(state: CatalogListState) {
  return Boolean(
    state.search || state.productType || state.categorySlug || state.sort !== 'newest'
  );
}
