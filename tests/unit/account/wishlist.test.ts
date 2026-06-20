import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireUser: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: vi.fn()}));

import {
  getCustomerWishlist,
  mapWishlistRows,
  wishlistItemCanCheckout,
  type WishlistHydrationRow
} from '@/account/wishlist';
import {removeCustomerWishlistItem} from '@/account/wishlist-actions';

const ownerId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';
const wishlistId = '44444444-4444-4444-8444-444444444444';

const availableRow: WishlistHydrationRow = {
  id: wishlistId,
  product_id: productId,
  created_at: '2026-06-20T00:00:00.000Z',
  products: {
    product_type: 'physical_finished',
    status: 'published',
    product_translations: [{locale: 'en', slug: 'pink-bunny', title: 'Pink bunny', description: 'Soft bunny'}],
    product_market_offers: [{market_code: 'intl', enabled: true, currency_code: 'USD', price_minor: 2400}],
    product_media: [{bucket_id: 'product-images', object_path: 'pink-bunny.jpg', alt_text_en: 'Pink bunny', alt_text_vi: 'Tho hong'}],
    inventory_records: [{quantity_on_hand: 3}],
    product_variants: []
  }
};

describe('account wishlist contracts (ACC-04, D-05, D-06, D-07)', () => {
  test('hydrates current localized catalog facts instead of stored snapshots', () => {
    expect(mapWishlistRows([availableRow], {locale: 'en', market: 'intl'})).toEqual([
      expect.objectContaining({
        id: wishlistId,
        productId,
        slug: 'pink-bunny',
        title: 'Pink bunny',
        description: 'Soft bunny',
        productType: 'physical_finished',
        available: true,
        inStock: true,
        currencyCode: 'USD',
        priceMinor: 2400,
        image: {
          bucket: 'product-images',
          path: 'pink-bunny.jpg',
          alt: 'Pink bunny'
        }
      })
    ]);
  });

  test('keeps products visible when unavailable in the active market', () => {
    const [item] = mapWishlistRows([
      {
        ...availableRow,
        products: {
          ...availableRow.products,
          product_market_offers: [{market_code: 'vn', enabled: true, currency_code: 'VND', price_minor: 520000}]
        }
      }
    ], {locale: 'en', market: 'intl'});

    expect(item).toMatchObject({
      available: false,
      currencyCode: null,
      priceMinor: null
    });
    expect(wishlistItemCanCheckout(item)).toBe(false);
  });

  test('does not expose a direct checkout action for out-of-stock physical products', () => {
    const [item] = mapWishlistRows([
      {
        ...availableRow,
        products: {
          ...availableRow.products,
          inventory_records: [{quantity_on_hand: 0}],
          product_variants: []
        }
      }
    ], {locale: 'en', market: 'intl'});

    expect(item).toMatchObject({available: true, inStock: false});
    expect(wishlistItemCanCheckout(item)).toBe(false);
  });

  test('queries wishlist rows by server-owned user id and active locale/market', async () => {
    const client = {rpc: vi.fn(() => Promise.resolve({data: [availableRow], error: null}))};

    await expect(
      getCustomerWishlist({userId: ownerId, locale: 'en', market: 'intl', client: client as never})
    ).resolves.toMatchObject({status: 'success', items: [{productId, available: true}]});

    expect(client.rpc).toHaveBeenCalledWith('get_customer_wishlist', {
      p_locale: 'en',
      p_market: 'intl'
    });
  });

  test('maps remove results without mutating cart state', async () => {
    const eqProduct = vi.fn(() => Promise.resolve({data: [{id: wishlistId}], error: null}));
    const eqUser = vi.fn(() => ({eq: eqProduct}));
    const select = vi.fn(() => ({eq: eqUser}));
    const deleteCall = vi.fn(() => ({select}));
    const client = {from: vi.fn(() => ({delete: deleteCall}))};

    await expect(
      removeCustomerWishlistItem({userId: ownerId, productId, client: client as never})
    ).resolves.toEqual({status: 'removed'});

    expect(client.from).toHaveBeenCalledWith('wishlist_items');
    expect(eqUser).toHaveBeenCalledWith('user_id', ownerId);
    expect(eqProduct).toHaveBeenCalledWith('product_id', productId);
  });
});
