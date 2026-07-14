import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {ProductDraftInput} from '@/catalog/schemas';

const {requireAdmin, createSupabaseServerClient, invalidateCatalogCache, recordOperationalFailure} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  invalidateCatalogCache: vi.fn(),
  recordOperationalFailure: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth/guards', () => ({requireAdmin}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient}));
vi.mock('@/lib/cache-invalidation', () => ({invalidateCatalogCache}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure}));

import {
  archiveProductAction,
  publishProductAction,
  saveAndPublishProductAction,
  saveProductDraftAction
} from '@/catalog/actions';
import {mapPublishIssues} from '@/catalog/publish-checks';
import {productDraftSchema} from '@/catalog/schemas';

const productId = '11111111-1111-4111-8111-111111111111';

function validDraft(): ProductDraftInput {
  return {
    productType: 'pdf_pattern' as const,
    translations: {
      vi: {
        title: 'Mau gau nho',
        description: 'Huong dan moc gau.',
        specifications: '{"difficulty":"easy"}',
        slug: 'mau-gau-nho',
        seoTitle: 'Mau gau nho',
        seoDescription: 'Tai mau moc gau nho.'
      },
      en: {
        title: 'Little bear pattern',
        description: 'Crochet a little bear.',
        specifications: '{"difficulty":"easy"}',
        slug: 'little-bear-pattern',
        seoTitle: 'Little bear pattern',
        seoDescription: 'Download the little bear crochet pattern.'
      }
    },
    categoryIds: ['22222222-2222-4222-8222-222222222222'],
    techniqueIds: [],
    tagIds: [],
    collections: [
      {
        collectionId: '33333333-3333-4333-8333-333333333333',
        displayOrder: 4
      }
    ],
    offers: {
      vn: {enabled: true, priceMinor: 125000},
      intl: {enabled: true, priceMinor: 700}
    }
  };
}

describe('product draft schema', () => {
  it('accepts bilingual content, independent taxonomy, and both market prices', () => {
    const result = productDraftSchema.safeParse(validDraft());

    expect(result.success).toBe(true);
  });

  it('allows one market to be disabled without a price', () => {
    const draft = validDraft();
    draft.offers.intl = {enabled: false, priceMinor: null};

    expect(productDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('allows publish-readiness omissions in an incomplete draft', () => {
    const draft = validDraft();
    draft.translations.vi.title = '';
    draft.translations.vi.slug = '   ';
    draft.offers.vn = {enabled: true, priceMinor: null};

    expect(productDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('rejects malformed non-empty slugs and non-object specifications', () => {
    const draft = validDraft();
    draft.translations.en.slug = 'Little Bear';
    draft.translations.en.specifications = '[]';

    const result = productDraftSchema.safeParse(draft);

    expect(result.success).toBe(false);
  });

  it.each([-1, 1.5])('rejects invalid collection display order %s', (displayOrder) => {
    const draft = validDraft();
    draft.collections[0].displayOrder = displayOrder;

    expect(productDraftSchema.safeParse(draft).success).toBe(false);
  });
});

describe('publish issue mapping', () => {
  it('maps database issue codes to stable field and workflow groups', () => {
    expect(
      mapPublishIssues([
        {
          issue_code: 'missing_seo_title',
          locale: 'vi',
          market_code: null,
          detail: 'raw database text'
        },
        {
          issue_code: 'missing_private_pdf',
          locale: null,
          market_code: null,
          detail: 'private internal path'
        },
        {
          issue_code: 'invalid_inventory',
          locale: null,
          market_code: null,
          detail: 'constraint detail'
        },
        {
          issue_code: 'incompatible_product_data',
          locale: null,
          market_code: null,
          detail: 'old type data'
        }
      ])
    ).toEqual([
      {
        code: 'missing_seo_title',
        group: 'translation',
        field: 'seoTitle',
        locale: 'vi'
      },
      {
        code: 'missing_private_pdf',
        group: 'media',
        field: 'privatePdf'
      },
      {
        code: 'invalid_inventory',
        group: 'variants',
        field: 'inventory'
      },
      {
        code: 'incompatible_product_data',
        group: 'general',
        field: 'productType'
      }
    ]);
  });

  it('maps unknown database codes to a generic blocker without raw details', () => {
    expect(
      mapPublishIssues([
        {
          issue_code: 'internal_policy_name',
          locale: null,
          market_code: null,
          detail: 'sensitive database payload'
        }
      ])
    ).toEqual([
      {
        code: 'publish_requirement',
        group: 'general',
        field: 'product'
      }
    ]);
  });
});

describe('catalog actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    createSupabaseServerClient.mockReset();
    recordOperationalFailure.mockClear();
    requireAdmin.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
  });

  it.each([
    ['save', () => saveProductDraftAction(validDraft())],
    ['save then publish', () => saveAndPublishProductAction({...validDraft(), productId})],
    ['publish', () => publishProductAction(productId)],
    ['archive', () => archiveProductAction(productId)]
  ])('authorizes before creating a database client for %s', async (_name, invoke) => {
    requireAdmin.mockRejectedValueOnce(new Error('redirected'));

    await expect(invoke()).rejects.toThrow('redirected');
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('publishes through the catalog RPC and returns mapped blockers', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({data: [{published: false}], error: null})
      .mockResolvedValueOnce({
        data: [
          {
            issue_code: 'missing_primary_image',
            locale: null,
            market_code: null,
            detail: 'raw detail'
          }
        ],
        error: null
      });
    createSupabaseServerClient.mockResolvedValue({rpc});

    const result = await publishProductAction(productId);

    expect(rpc.mock.calls).toEqual([
      ['publish_catalog_product', {target_product_id: productId}],
      ['catalog_publish_issues', {target_product_id: productId}]
    ]);
    expect(result).toEqual({
      status: 'blocked',
      productId,
      issues: [
        {
          code: 'missing_primary_image',
          group: 'media',
          field: 'primaryImage'
        }
      ]
    });
  });

  it('does not expose raw RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'relation private.secret_table does not exist'}
    });
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(publishProductAction(productId)).resolves.toMatchObject({
      status: 'error',
      code: 'publish_failed'
    });
  });

  it('saves the complete product aggregate through one RPC call', async () => {
    const rpc = vi.fn(async () => ({data: productId, error: null}));
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(saveProductDraftAction(validDraft())).resolves.toEqual({
      status: 'saved',
      productId
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'admin_save_catalog_product',
      expect.objectContaining({
        p_payload: expect.objectContaining({
          product_id: null,
          product_type: 'pdf_pattern',
          category_ids: ['22222222-2222-4222-8222-222222222222'],
          translations: expect.arrayContaining([
            expect.objectContaining({locale: 'vi', slug: 'mau-gau-nho'}),
            expect.objectContaining({locale: 'en', slug: 'little-bear-pattern'})
          ])
        })
      })
    );
  });

  it('saves the exact current editor snapshot before checking publish blockers', async () => {
    const draft = {...validDraft(), productId};
    draft.translations.en.title = 'Unsaved editor title';
    draft.offers.vn.priceMinor = 175000;
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({data: productId, error: null})
      .mockResolvedValueOnce({data: [{published: false}], error: null})
      .mockResolvedValueOnce({
        data: [
          {
            issue_code: 'missing_primary_image',
            locale: null,
            market_code: null,
            detail: 'raw detail'
          }
        ],
        error: null
      });
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(saveAndPublishProductAction(draft)).resolves.toEqual({
      status: 'blocked',
      productId,
      issues: [
        {
          code: 'missing_primary_image',
          group: 'media',
          field: 'primaryImage'
        }
      ]
    });

    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'admin_save_catalog_product',
      'publish_catalog_product',
      'catalog_publish_issues'
    ]);
    expect(rpc.mock.calls[0]).toEqual([
      'admin_save_catalog_product',
      {
        p_payload: expect.objectContaining({
          product_id: productId,
          translations: expect.arrayContaining([
            expect.objectContaining({locale: 'en', title: 'Unsaved editor title'})
          ]),
          offers: expect.arrayContaining([
            expect.objectContaining({market_code: 'vn', price_minor: 175000})
          ])
        })
      }
    ]);
  });

  it('does not attempt publication when saving the current snapshot fails', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({
      data: null,
      error: {message: 'aggregate save failed'}
    });
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(
      saveAndPublishProductAction({...validDraft(), productId})
    ).resolves.toMatchObject({status: 'error', code: 'save_failed'});

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_save_catalog_product', expect.any(Object));
  });

  it('does not create a client or publish when the current snapshot is structurally invalid', async () => {
    const draft = {...validDraft(), productId};
    draft.translations.en.slug = 'Invalid Slug';

    await expect(saveAndPublishProductAction(draft)).resolves.toMatchObject({
      status: 'invalid',
      issues: expect.arrayContaining([
        expect.objectContaining({path: 'translations.en.slug', code: 'invalid_slug'})
      ])
    });

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('records publish RPC failures without exposing raw database errors', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'relation private.secret_table does not exist'}
    });
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(publishProductAction(productId)).resolves.toMatchObject({
      status: 'error',
      code: 'publish_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_publish_failed',
        summary: 'Catalog product publish failed',
        facts: expect.objectContaining({
          action: 'catalog_publish',
          productId,
          code: 'publish_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/secret_table|relation|Little bear|mau-gau|private/i);
  });

  it('records atomic draft RPC failures without exposing raw product content', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {message: 'private taxonomy detail'}
    }));
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(saveProductDraftAction(validDraft())).resolves.toMatchObject({
      status: 'error',
      code: 'save_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_save_failed',
        summary: 'Catalog product save failed',
        facts: expect.objectContaining({
          action: 'catalog_save_product',
          status: 'draft',
          code: 'save_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/Little bear|Mau gau|private taxonomy|seo|slug/i);
  });

  it('records archive failures with only the product reference', async () => {
    const eq = vi.fn(async () => ({error: {message: 'archive constraint detail'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(archiveProductAction(productId)).resolves.toMatchObject({
      status: 'error',
      code: 'archive_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_archive_failed',
        summary: 'Catalog product archive failed',
        facts: expect.objectContaining({
          action: 'catalog_archive',
          productId,
          code: 'archive_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/archive constraint detail/i);
  });

  it('keeps catalog action error states when operational recording fails', async () => {
    recordOperationalFailure.mockRejectedValue(new Error('operational table unavailable'));

    createSupabaseServerClient.mockResolvedValueOnce({
      rpc: vi.fn(async () => ({data: null, error: {message: 'product save failed'}}))
    });
    await expect(saveProductDraftAction(validDraft())).resolves.toEqual({
      status: 'error',
      code: 'save_failed'
    });

    createSupabaseServerClient.mockResolvedValueOnce({
      rpc: vi.fn(async () => ({data: null, error: {message: 'publish failed'}}))
    });
    await expect(publishProductAction(productId)).resolves.toEqual({
      status: 'error',
      code: 'publish_failed'
    });

    const eq = vi.fn(async () => ({error: {message: 'archive failed'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({update}))
    });
    await expect(archiveProductAction(productId)).resolves.toEqual({
      status: 'error',
      code: 'archive_failed'
    });
  });
});
