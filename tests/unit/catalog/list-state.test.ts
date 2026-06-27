import {describe, expect, it} from 'vitest';
import {catalogListState, hasCatalogFilters} from '@/catalog/list-state';

describe('catalog list state', () => {
  it('accepts and normalizes allowlisted URL filters', () => {
    expect(
      catalogListState({
        search: ' bear ',
        type: 'pdf_pattern',
        category: ' stuffed-animals ',
        sort: 'price_asc'
      })
    ).toEqual({
      search: 'bear',
      productType: 'pdf_pattern',
      categorySlug: 'stuffed-animals',
      sort: 'price_asc'
    });
  });

  it('uses the first query value and bounds free text', () => {
    const longSearch = 'a'.repeat(120);

    expect(
      catalogListState({search: [longSearch, 'ignored'], category: ['gifts', 'ignored']})
    ).toEqual({
      search: 'a'.repeat(100),
      productType: undefined,
      categorySlug: 'gifts',
      sort: 'newest'
    });
  });

  it('drops invalid values and detects meaningful filters', () => {
    const defaults = catalogListState({type: 'invalid', category: '   ', sort: 'invalid'});

    expect(defaults).toEqual({
      search: undefined,
      productType: undefined,
      categorySlug: undefined,
      sort: 'newest'
    });
    expect(hasCatalogFilters(defaults)).toBe(false);
    expect(hasCatalogFilters({...defaults, sort: 'title'})).toBe(true);
    expect(hasCatalogFilters({...defaults, productType: 'physical_finished'})).toBe(true);
  });
});
