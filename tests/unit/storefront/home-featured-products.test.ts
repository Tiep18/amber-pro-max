import { describe, expect, it, vi } from 'vitest';
import { getHomeFeaturedProducts } from '@/storefront/home-featured-products';

describe('home featured products loader', () => {
  it('records an operational failure before falling back to empty featured products', async () => {
    const recordOperationalFailure = vi.fn(() => Promise.resolve({ status: 'recorded', errorId: 'error-1' }));
    const getProducts = vi.fn(() => Promise.reject(new Error('cache unavailable')));

    await expect(
      getHomeFeaturedProducts({
        locale: 'en',
        productType: 'pdf_pattern',
        getProducts,
        recordOperationalFailure
      })
    ).resolves.toEqual([]);

    expect(recordOperationalFailure).toHaveBeenCalledWith({
      area: 'storefront',
      severity: 'warning',
      errorCode: 'storefront.home.featured_products_failed',
      summary: 'Home featured products failed',
      facts: {
        action: 'home_featured_products',
        locale: 'en',
        market: 'intl',
        productType: 'pdf_pattern',
        code: 'storefront.home.featured_products_failed'
      }
    });
  });
});
