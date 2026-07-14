import {beforeEach, describe, expect, it, vi} from 'vitest';

const {recordOperationalFailure} = vi.hoisted(() => ({
  recordOperationalFailure: vi.fn(async () => ({status: 'recorded'}))
}));

vi.mock('@/operations/errors', () => ({recordOperationalFailure}));

import {
  assertCatalogAdminQueryResults,
  CatalogAdminLoadError
} from '@/catalog/admin-query-results';

describe('catalog admin query result boundary', () => {
  beforeEach(() => {
    recordOperationalFailure.mockClear();
  });

  it('accepts complete query results without recording an error', async () => {
    await expect(
      assertCatalogAdminQueryResults([{error: null}, {error: null}], {
        action: 'catalog_product_editor'
      })
    ).resolves.toBeUndefined();
    expect(recordOperationalFailure).not.toHaveBeenCalled();
  });

  it('records a failed query and exposes only a recoverable catalog load error', async () => {
    await expect(
      assertCatalogAdminQueryResults(
        [{error: null}, {error: {code: '57014', message: 'private relation detail'}}],
        {
          action: 'catalog_product_editor',
          productId: '11111111-1111-4111-8111-111111111111'
        }
      )
    ).rejects.toEqual(new CatalogAdminLoadError());

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        errorCode: 'catalog_admin_load_failed',
        summary: 'Catalog admin data load failed',
        facts: expect.objectContaining({
          action: 'catalog_product_editor',
          code: 'catalog_admin_load_failed',
          dbCode: '57014',
          productId: '11111111-1111-4111-8111-111111111111'
        })
      })
    );
  });
});
