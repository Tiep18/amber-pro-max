import {describe, expect, it} from 'vitest';
import {
  catalogListState,
  catalogListStateFromSearchParams,
  hasCatalogFilters
} from '@/catalog/list-state';

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

  it('normalizes technique and tag from URLSearchParams without retaining unknown keys', () => {
    const params = new URLSearchParams();
    params.append('search', '  bear  ');
    params.append('search', 'ignored');
    params.set('type', 'physical_finished');
    params.set('category', 'toys');
    params.set('technique', 'crochet');
    params.set('tag', 'gift');
    params.set('sort', 'title');
    params.set('market', 'vn');
    params.set('unexpected', 'poison');

    expect(catalogListStateFromSearchParams(params)).toEqual({
      search: 'bear',
      productType: 'physical_finished',
      categorySlug: 'toys',
      techniqueSlug: 'crochet',
      tagSlug: 'gift',
      sort: 'title'
    });
  });

  it('bounds URL taxonomy values and discards unsupported enum values', () => {
    const params = new URLSearchParams({
      type: 'private_type',
      category: 'c'.repeat(101),
      technique: 't'.repeat(120),
      tag: '   ',
      sort: 'private_sort'
    });

    expect(catalogListStateFromSearchParams(params)).toEqual({
      search: undefined,
      productType: undefined,
      categorySlug: 'c'.repeat(100),
      techniqueSlug: 't'.repeat(100),
      tagSlug: undefined,
      sort: 'newest'
    });
  });
});
