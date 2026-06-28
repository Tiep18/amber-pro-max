import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdmin, createSupabaseServerClient, revalidatePath, revalidateTag } = vi.hoisted(
  () => ({
    requireAdmin: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn()
  })
);

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));
vi.mock('@/auth/guards', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient }));

import {
  adjustInventoryAction,
  removeVariantAction,
  saveVariantAction,
  saveVariantPriceOverrideAction
} from '@/catalog/variant-actions';
import { resolveEffectiveVariantPrice } from '@/catalog/variant-pricing';
import {
  inventoryAdjustmentSchema,
  variantDraftSchema,
  variantPriceOverrideSchema
} from '@/catalog/variant-schemas';

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
      attributes: '{"size":"small","color":"brown"}',
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
        attributes: '{}',
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
});

describe('variant actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    createSupabaseServerClient.mockReset();
    revalidatePath.mockReset();
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
          attributes: '{"size":"small"}',
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
    ['remove variant', () => removeVariantAction({ productId, variantId })]
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
      attributes: '{"size":"small"}',
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
        attributes: '{"size":"small"}',
        displayOrder: 0,
        mediaId: null
      })
    ).resolves.toEqual({ status: 'invalid', code: 'duplicate_sku' });
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
