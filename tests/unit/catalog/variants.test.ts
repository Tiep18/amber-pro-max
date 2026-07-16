import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdmin, createSupabaseServerClient, revalidatePath, revalidateTag, recordOperationalFailure } = vi.hoisted(
  () => ({
    requireAdmin: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    recordOperationalFailure: vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}))
  })
);

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));
vi.mock('@/auth/guards', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));
vi.mock('@/operations/errors', () => ({ recordOperationalFailure }));

import {
  adjustInventoryAction,
  removeVariantAction,
  saveVariantAggregateAction,
  saveVariantAction,
  saveVariantPriceOverrideAction
} from '@/catalog/variant-actions';
import { resolveEffectiveVariantPrice } from '@/catalog/variant-pricing';
import {
  attributesToRows,
  canonicalAttributesText,
  normalizeVariantAttributes,
  rowsToVariantAttributes
} from '@/catalog/variant-attributes';
import {
  inventoryAdjustmentSchema,
  variantAggregateDraftSchema,
  variantDraftSchema,
  variantPriceOverrideSchema
} from '@/catalog/variant-schemas';
import {saveVariantEditorDraft, type VariantEditorVariant} from '@/components/admin/catalog/variant-editor';

const productId = '11111111-1111-4111-8111-111111111111';
const variantId = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';

function createFromMock() {
  const calls: Array<{ table: string; operation: string; payload?: unknown }> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(),
    single: vi.fn()
  };
  const from = vi.fn((table: string) => ({
    ...builder,
    insert: vi.fn((payload: unknown) => {
      calls.push({ table, operation: 'insert', payload });
      return {
        select: () => ({ single: () => Promise.resolve({ data: { id: variantId }, error: null }) })
      };
    }),
    upsert: vi.fn((payload: unknown) => {
      calls.push({ table, operation: 'upsert', payload });
      return Promise.resolve({ error: null });
    }),
    update: vi.fn((payload: unknown) => {
      calls.push({ table, operation: 'update', payload });
      return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    }),
    delete: vi.fn(() => {
      calls.push({ table, operation: 'delete' });
      return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    })
  }));

  return { from, calls };
}

describe('variant schemas', () => {
  it('accepts explicit physical variants with SKU, attributes, display order, and optional media', () => {
    const result = variantDraftSchema.safeParse({
      productId,
      variantId,
      sku: 'BEAR-BROWN-SMALL',
      attributes: {size: 'small', color: 'brown'},
      displayOrder: 2,
      mediaId
    });

    expect(result.success).toBe(true);
  });

  it('rejects implicit combinations, empty attributes, negative quantities, and wrong override currencies', () => {
    expect(
      variantDraftSchema.safeParse({
        productId,
        variantId,
        sku: 'BEAR-BLANK',
        attributes: {},
        displayOrder: 0,
        mediaId: null
      }).success
    ).toBe(false);

    expect(
      inventoryAdjustmentSchema.safeParse({
        ownerType: 'product',
        productId,
        quantityOnHand: -1
      }).success
    ).toBe(false);

    expect(
      variantPriceOverrideSchema.safeParse({
        variantId,
        marketCode: 'vn',
        currencyCode: 'USD',
        priceMinor: 1200
      }).success
    ).toBe(false);

    expect(
      variantDraftSchema.safeParse({
        productId,
        variantId,
        sku: 'BEAR-NUMERIC',
        attributes: {size: 2},
        displayOrder: 0,
        mediaId: null
      }).success
    ).toBe(false);
  });

  it('validates the complete variant aggregate and rejects duplicate override markets', () => {
    const input = {
      productId,
      variantId,
      sku: 'BEAR-S',
      attributes: {size: 'small'},
      displayOrder: 0,
      mediaId: null,
      quantityOnHand: 3,
      overrides: [
        {marketCode: 'vn' as const, enabled: true, currencyCode: 'VND' as const, priceMinor: 120000}
      ]
    };

    expect(variantAggregateDraftSchema.safeParse(input).success).toBe(true);
    expect(
      variantAggregateDraftSchema.safeParse({
        ...input,
        overrides: [...input.overrides, {...input.overrides[0], priceMinor: 130000}]
      }).success
    ).toBe(false);
  });
});

describe('variant attribute records', () => {
  it('trims and sorts string entries deterministically', () => {
    expect(normalizeVariantAttributes({size: ' small ', color: ' brown '})).toEqual({color: 'brown', size: 'small'});
    expect(canonicalAttributesText({size: 'small', color: 'brown'})).toBe('{"color":"brown","size":"small"}');
  });

  it.each([{size: 2}, {size: false}, {size: {}}, {size: []}, {size: '  '}, {}])(
    'rejects malformed attribute record %j',
    (attributes) => expect(normalizeVariantAttributes(attributes)).toBeNull()
  );

  it('reports row-local blanks and duplicate trimmed keys', () => {
    expect(
      rowsToVariantAttributes([
        {id: '1', key: ' size ', value: 'small'},
        {id: '2', key: 'size', value: ''}
      ])
    ).toEqual({
      attributes: null,
      issues: [
        {index: 1, field: 'value', message: 'Enter an attribute value.'},
        {index: 1, field: 'key', message: 'Attribute names must be unique.'}
      ]
    });
  });

  it('converts canonical records into ordered editor rows', () => {
    const ids = ['a', 'b'];
    expect(attributesToRows({size: 'small', color: 'brown'}, () => ids.shift() ?? 'x')).toEqual([
      {id: 'a', key: 'color', value: 'brown'},
      {id: 'b', key: 'size', value: 'small'}
    ]);
  });
});

describe('effective variant pricing', () => {
  it('uses variant override before parent fallback while preserving market currency', () => {
    const price = resolveEffectiveVariantPrice({
      marketCode: 'vn',
      parentOffers: [
        { marketCode: 'vn', enabled: true, currencyCode: 'VND', priceMinor: 125000 },
        { marketCode: 'intl', enabled: true, currencyCode: 'USD', priceMinor: 700 }
      ],
      variantOverrides: [
        { marketCode: 'vn', enabled: true, currencyCode: 'VND', priceMinor: 150000 }
      ]
    });

    expect(price).toEqual({
      source: 'variant',
      marketCode: 'vn',
      currencyCode: 'VND',
      priceMinor: 150000
    });
  });

  it('falls back to the parent offer when no variant override exists', () => {
    const price = resolveEffectiveVariantPrice({
      marketCode: 'intl',
      parentOffers: [{ marketCode: 'intl', enabled: true, currencyCode: 'USD', priceMinor: 700 }],
      variantOverrides: []
    });

    expect(price).toEqual({
      source: 'parent',
      marketCode: 'intl',
      currencyCode: 'USD',
      priceMinor: 700
    });
  });

  it('treats an explicit disabled override as unavailable instead of falling back', () => {
    const price = resolveEffectiveVariantPrice({
      marketCode: 'intl',
      parentOffers: [{ marketCode: 'intl', enabled: true, currencyCode: 'USD', priceMinor: 700 }],
      variantOverrides: [
        { marketCode: 'intl', enabled: false, currencyCode: 'USD', priceMinor: 900 }
      ]
    });

    expect(price).toEqual({source: 'none', marketCode: 'intl'});
  });
});

describe('variant actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    createSupabaseServerClient.mockReset();
    revalidatePath.mockReset();
    recordOperationalFailure.mockReset();
    requireAdmin.mockResolvedValue({ id: 'admin-id', email: 'admin@example.com' });
  });

  it.each([
    [
      'save variant',
      () =>
        saveVariantAction({
          productId,
          variantId,
          sku: 'BEAR-S',
          attributes: {size: 'small'},
          displayOrder: 0,
          mediaId: null
        })
    ],
    [
      'price override',
      () =>
        saveVariantPriceOverrideAction({
          variantId,
          marketCode: 'intl',
          currencyCode: 'USD',
          priceMinor: 900
        })
    ],
    [
      'inventory',
      () => adjustInventoryAction({ ownerType: 'variant', productId, variantId, quantityOnHand: 3 })
    ],
    ['remove variant', () => removeVariantAction({ productId, variantId })],
    [
      'aggregate variant save',
      () =>
        saveVariantAggregateAction({
          productId,
          variantId,
          sku: 'BEAR-S',
          attributes: {size: 'small'},
          displayOrder: 0,
          mediaId: null,
          quantityOnHand: 3,
          overrides: []
        })
    ]
  ])('authorizes before creating a database client for %s', async (_label, invoke) => {
    requireAdmin.mockRejectedValueOnce(new Error('redirected'));

    await expect(invoke()).rejects.toThrow('redirected');
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('rejects variant payloads for PDF products before writing', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { id: productId, product_type: 'pdf_pattern' }, error: null })
      )
    };
    const from = vi.fn(() => productQuery);
    createSupabaseServerClient.mockResolvedValue({ from });

    const result = await saveVariantAction({
      productId,
      variantId,
      sku: 'PDF-SKU',
      attributes: {size: 'small'},
      displayOrder: 0,
      mediaId: null
    });

    expect(result).toEqual({ status: 'invalid', code: 'not_physical_product' });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('upserts explicit variants and maps duplicate SKU database failures', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { id: productId, product_type: 'physical_finished' }, error: null })
      )
    };
    const upsert = vi.fn(() => Promise.resolve({ error: { code: '23505' } }));
    const from = vi.fn((table: string) => (table === 'products' ? productQuery : { upsert }));
    createSupabaseServerClient.mockResolvedValue({ from });

    await expect(
      saveVariantAction({
        productId,
        variantId,
        sku: 'BEAR-S',
        attributes: {size: 'small'},
        displayOrder: 0,
        mediaId: null
      })
    ).resolves.toEqual({ status: 'invalid', code: 'duplicate_sku' });
  });

  it('saves a variant, desired overrides, and inventory through one aggregate RPC', async () => {
    const rpc = vi.fn(async () => ({data: variantId, error: null}));
    createSupabaseServerClient.mockResolvedValue({rpc});

    await expect(
      saveVariantAggregateAction({
        productId,
        variantId,
        sku: 'BEAR-S',
        attributes: {size: 'small'},
        displayOrder: 2,
        mediaId: null,
        quantityOnHand: 3,
        overrides: [
          {marketCode: 'intl', enabled: false, currencyCode: 'USD', priceMinor: 900}
        ]
      })
    ).resolves.toEqual({status: 'success', message: 'Variant saved'});

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_save_catalog_variant', {
      p_payload: {
        product_id: productId,
        variant_id: variantId,
        sku: 'BEAR-S',
        attributes: {size: 'small'},
        display_order: 2,
        media_id: null,
        quantity_on_hand: 3,
        overrides: [
          {market_code: 'intl', enabled: false, currency_code: 'USD', price_minor: 900}
        ]
      }
    });
  });

  it.each([
    ['P2001', 'product_not_found'],
    ['P2002', 'not_physical_product'],
    ['P2003', 'wrong_inventory_owner'],
    ['P2004', 'invalid_input'],
    ['23505', 'duplicate_sku'],
    ['23514', 'wrong_inventory_owner']
  ] as const)('maps aggregate database code %s to %s', async (databaseCode, expectedCode) => {
    createSupabaseServerClient.mockResolvedValue({
      rpc: vi.fn(async () => ({data: null, error: {code: databaseCode}}))
    });

    await expect(
      saveVariantAggregateAction({
        productId,
        variantId,
        sku: 'BEAR-S',
        attributes: {size: 'small'},
        displayOrder: 0,
        mediaId: null,
        quantityOnHand: 3,
        overrides: []
      })
    ).resolves.toEqual({status: 'invalid', code: expectedCode});
  });

  it('lets the editor persist a variant through exactly one aggregate action call', async () => {
    const save = vi.fn(async () => ({status: 'success', message: 'Variant saved'} as const));
    const draft: VariantEditorVariant = {
      id: variantId,
      sku: 'BEAR-S',
      attributes: {size: 'small'},
      displayOrder: 1,
      mediaId: null,
      quantityOnHand: 5,
      shippingProfileId: null,
      overrides: [
        {marketCode: 'intl', enabled: false, currencyCode: 'USD', priceMinor: 900}
      ]
    };

    await expect(saveVariantEditorDraft(productId, draft, save)).resolves.toEqual({
      status: 'success',
      message: 'Variant saved'
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId,
        variantId,
        quantityOnHand: 5,
        overrides: [
          {marketCode: 'intl', enabled: false, currencyCode: 'USD', priceMinor: 900}
        ]
      })
    );
  });

  it('records generic variant save failures without exposing SKU attributes or database details', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { id: productId, product_type: 'physical_finished' }, error: null })
      )
    };
    const upsert = vi.fn(() => Promise.resolve({ error: { message: 'private variant write failed' } }));
    const from = vi.fn((table: string) => (table === 'products' ? productQuery : { upsert }));
    createSupabaseServerClient.mockResolvedValue({ from });

    await expect(
      saveVariantAction({
        productId,
        variantId,
        sku: 'SECRET-SKU',
        attributes: {size: 'small', private: 'do-not-log'},
        displayOrder: 0,
        mediaId: null
      })
    ).resolves.toMatchObject({ status: 'error', code: 'save_failed' });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_variant_save_failed',
        summary: 'Catalog variant save failed',
        facts: expect.objectContaining({
          action: 'variant_save',
          productId,
          referenceId: variantId,
          code: 'save_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/SECRET-SKU|do-not-log|private variant|email|token/i);
  });

  it('records variant remove failures with only product and variant references', async () => {
    const deleteEqProduct = vi.fn(() => Promise.resolve({data: null, error: {message: 'private remove detail'}}));
    const deleteEqId = vi.fn(() => ({ eq: deleteEqProduct }));
    const deleteCall = vi.fn(() => ({select: () => ({eq: deleteEqId})}));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ delete: deleteCall }))
    });

    await expect(removeVariantAction({ productId, variantId })).resolves.toMatchObject({
      status: 'error',
      code: 'remove_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_variant_remove_failed',
        summary: 'Catalog variant remove failed',
        facts: expect.objectContaining({
          action: 'variant_remove',
          productId,
          referenceId: variantId,
          code: 'remove_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/private remove|email|token/i);
  });

  it('keeps variant error states when operational recording fails', async () => {
    recordOperationalFailure.mockRejectedValue(new Error('operational table unavailable'));

    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { id: productId, product_type: 'physical_finished' }, error: null })
      )
    };
    const upsert = vi.fn(() => Promise.resolve({ error: { message: 'variant write failed' } }));
    const from = vi.fn((table: string) => (table === 'products' ? productQuery : { upsert }));
    createSupabaseServerClient.mockResolvedValue({ from });

    await expect(
      saveVariantAction({
        productId,
        variantId,
        sku: 'BEAR-S',
        attributes: {size: 'small'},
        displayOrder: 0,
        mediaId: null
      })
    ).resolves.toEqual({ status: 'error', code: 'save_failed' });

    const deleteEqProduct = vi.fn(() => Promise.resolve({data: null, error: {message: 'remove failed'}}));
    const deleteEqId = vi.fn(() => ({ eq: deleteEqProduct }));
    const deleteCall = vi.fn(() => ({select: () => ({eq: deleteEqId})}));
    createSupabaseServerClient.mockResolvedValueOnce({
      from: vi.fn(() => ({ delete: deleteCall }))
    });

    await expect(removeVariantAction({ productId, variantId })).resolves.toEqual({
      status: 'error',
      code: 'remove_failed'
    });
  });

  it('reports a stale exact variant removal as not found', async () => {
    const deleteEqProduct = vi.fn(() => Promise.resolve({data: [], error: null}));
    const deleteEqId = vi.fn(() => ({eq: deleteEqProduct}));
    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({delete: () => ({select: () => ({eq: deleteEqId})})}))
    });

    await expect(removeVariantAction({productId, variantId})).resolves.toEqual({
      status: 'invalid',
      code: 'variant_not_found'
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('stores product-level inventory only for non-variant physical products', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { id: productId, product_type: 'physical_finished' }, error: null })
      )
    };
    const variantQuery = {
      select: vi.fn(() => variantQuery),
      eq: vi.fn(() => variantQuery),
      limit: vi.fn(() => variantQuery),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
    };
    const { calls } = createFromMock();
    const from = vi.fn((table: string) => {
      if (table === 'products') return productQuery;
      if (table === 'product_variants') return variantQuery;
      return {
        upsert: vi.fn((payload: unknown) => {
          calls.push({ table, operation: 'upsert', payload });
          return Promise.resolve({ error: null });
        })
      };
    });
    createSupabaseServerClient.mockResolvedValue({ from });

    const result = await adjustInventoryAction({
      ownerType: 'product',
      productId,
      quantityOnHand: 5
    });

    expect(result).toEqual({ status: 'success', message: 'Inventory saved' });
    expect(calls).toEqual([
      {
        table: 'inventory_records',
        operation: 'upsert',
        payload: { product_id: productId, variant_id: null, quantity_on_hand: 5 }
      }
    ]);
  });
});
