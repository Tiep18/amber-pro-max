import {beforeEach, describe, expect, it, vi} from 'vitest';

const requireAdmin = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/auth/guards', () => ({requireAdmin}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient}));

import {
  archiveProductAction,
  publishProductAction,
  saveProductDraftAction
} from '@/catalog/actions';
import {mapPublishIssues} from '@/catalog/publish-checks';
import {productDraftSchema} from '@/catalog/schemas';

const productId = '11111111-1111-4111-8111-111111111111';

function validDraft() {
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

  it('rejects an enabled market without a non-negative integer price', () => {
    const draft = validDraft();
    draft.offers.vn = {enabled: true, priceMinor: null};

    const result = productDraftSchema.safeParse(draft);

    expect(result.success).toBe(false);
  });

  it('rejects invalid localized slugs and non-object specifications', () => {
    const draft = validDraft();
    draft.translations.en.slug = 'Little Bear';
    draft.translations.en.specifications = '[]';

    const result = productDraftSchema.safeParse(draft);

    expect(result.success).toBe(false);
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
    requireAdmin.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
  });

  it.each([
    ['save', () => saveProductDraftAction(validDraft())],
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

    await expect(publishProductAction(productId)).resolves.toEqual({
      status: 'error',
      code: 'publish_failed'
    });
  });
});
