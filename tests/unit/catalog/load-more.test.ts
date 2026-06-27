import {describe, expect, it} from 'vitest';
import {
  CATALOG_PAGE_SIZE,
  nextCatalogCount,
  visibleCatalogCount
} from '@/components/catalog/catalog-result-grid';

describe('catalog progressive disclosure', () => {
  it('caps the initial visible count to the available products', () => {
    expect(visibleCatalogCount(5, CATALOG_PAGE_SIZE)).toBe(5);
    expect(visibleCatalogCount(30, CATALOG_PAGE_SIZE)).toBe(12);
  });

  it('reveals one bounded page at a time', () => {
    expect(nextCatalogCount(12, 30)).toBe(24);
    expect(nextCatalogCount(24, 30)).toBe(30);
    expect(nextCatalogCount(30, 30)).toBe(30);
  });
});
