import type {ProductType} from './types';

type SelectedVariant = {
  enabled: boolean;
  stock: boolean;
} | null;

export function canAddToCart({
  available,
  productType,
  inStock,
  needsVariant,
  selectedVariant
}: {
  available: boolean;
  productType: ProductType;
  inStock: boolean;
  needsVariant: boolean;
  selectedVariant: SelectedVariant;
}) {
  if (!available) {
    return false;
  }
  if (productType === 'pdf_pattern') {
    return true;
  }
  if (needsVariant) {
    return Boolean(selectedVariant?.enabled && selectedVariant.stock);
  }
  return inStock;
}
