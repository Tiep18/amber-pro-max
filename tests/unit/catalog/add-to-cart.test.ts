import {describe, expect, it} from 'vitest';
import {canAddToCart} from '@/catalog/add-to-cart-eligibility';

describe('catalog add-to-cart availability', () => {
  it('blocks physical products without variants when product inventory is unavailable', () => {
    expect(
      canAddToCart({
        available: true,
        productType: 'physical_finished',
        inStock: false,
        needsVariant: false,
        selectedVariant: null
      })
    ).toBe(false);
  });

  it('allows market-available digital products without inventory checks', () => {
    expect(
      canAddToCart({
        available: true,
        productType: 'pdf_pattern',
        inStock: false,
        needsVariant: false,
        selectedVariant: null
      })
    ).toBe(true);
  });
});
