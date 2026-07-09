import {describe, expect, it, vi} from 'vitest';

vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import type {SupabaseClient} from '@supabase/supabase-js';
import {
  getCatalogProductBySlug,
  listCatalogFacets,
  listCatalogProducts
} from '@/catalog/queries';
import {recordOperationalFailure} from '@/operations/errors';
import type {Database} from '@/types/supabase';

function mockClient(result: {data: unknown; error: unknown}) {
  return {
    rpc: vi.fn().mockResolvedValue(result)
  } as unknown as SupabaseClient<Database>;
}

describe('catalog query helpers', () => {
  it('always passes locale and market and normalizes allowlisted list inputs', async () => {
    const client = mockClient({data: [], error: null});

    await listCatalogProducts(
      {
        locale: 'vi',
        market: 'vn',
        search: `  ${'g'.repeat(120)}  `,
        productType: 'physical_finished',
        categorySlug: ' gau-bong ',
        techniqueId: '42000000-0000-0000-0000-000000000001',
        tagId: '43000000-0000-0000-0000-000000000001',
        sort: 'price_asc'
      },
      client
    );

    expect(client.rpc).toHaveBeenCalledWith('list_catalog_products', {
      p_locale: 'vi',
      p_market: 'vn',
      p_search: 'g'.repeat(100),
      p_product_type: 'physical_finished',
      p_category_slug: 'gau-bong',
      p_technique_id: '42000000-0000-0000-0000-000000000001',
      p_tag_id: '43000000-0000-0000-0000-000000000001',
      p_sort: 'price_asc'
    });
  });

  it('encodes collection ordering through a bounded collection sort token', async () => {
    const client = mockClient({data: [], error: null});

    await listCatalogProducts(
      {locale: 'en', market: 'intl', collectionSlug: ' gifts ', sort: 'title'},
      client
    );

    expect(client.rpc).toHaveBeenCalledWith(
      'list_catalog_products',
      expect.objectContaining({p_locale: 'en', p_market: 'intl', p_sort: 'collection:gifts'})
    );
  });

  it('uses mandatory locale and market for facets and detail', async () => {
    const client = mockClient({data: [], error: null});

    await listCatalogFacets({locale: 'en', market: 'intl'}, client);
    await getCatalogProductBySlug(
      {locale: 'en', market: 'intl', slug: ' both-market-bear '},
      client
    );

    expect(client.rpc).toHaveBeenNthCalledWith(1, 'list_catalog_facets', {
      p_locale: 'en',
      p_market: 'intl'
    });
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'get_catalog_product_by_slug', {
      p_locale: 'en',
      p_market: 'intl',
      p_slug: 'both-market-bear'
    });
  });

  it('returns null for an empty detail slug without querying', async () => {
    const client = mockClient({data: [], error: null});

    await expect(
      getCatalogProductBySlug({locale: 'vi', market: 'vn', slug: '   '}, client)
    ).resolves.toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('does not expose raw database errors', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const client = mockClient({
      data: null,
      error: {message: 'relation private.inventory_records does not exist'}
    });

    await expect(
      listCatalogProducts({locale: 'en', market: 'intl'}, client)
    ).rejects.toThrow('catalog_query_failed');

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'storefront.catalog.query_failed',
        summary: 'Storefront catalog product list query failed',
        facts: expect.objectContaining({
          action: 'catalog_products',
          market: 'intl',
          code: 'catalog_query_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/inventory_records|relation|private|email|token/i);
  });

  it('keeps stable catalog query errors when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const client = mockClient({
      data: null,
      error: {message: 'catalog rpc failed'}
    });

    await expect(listCatalogProducts({locale: 'en', market: 'intl'}, client)).rejects.toThrow('catalog_query_failed');
  });
});
