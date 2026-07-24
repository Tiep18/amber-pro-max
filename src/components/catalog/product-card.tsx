import { getTranslations } from 'next-intl/server';
import type { CatalogProduct } from '@/catalog/queries';
import {
  ProductCardView,
  type ProductCardLabels
} from '@/components/catalog/product-card-view';
import type { Locale } from '@/i18n/routing';

const placeholderLabels = {
  vi: { brand: 'Ambertinybear', status: 'Dang cap nhat anh' },
  en: { brand: 'Ambertinybear', status: 'Image coming soon' }
} as const;

export async function ProductCard({
  product,
  locale,
  eagerImage = false,
  initiallyWishlisted = false
}: {
  product: CatalogProduct;
  locale: Locale;
  eagerImage?: boolean;
  initiallyWishlisted?: boolean;
}) {
  const t = await getTranslations('catalog');
  const labels: ProductCardLabels = {
    viewProduct: t('viewProduct'),
    pdfPattern: t('pdfPattern'),
    finishedItem: t('finishedItem'),
    inStock: t('inStock'),
    outOfStock: t('outOfStock'),
    placeholder: placeholderLabels[locale],
    wishlist: {
      save: t('wishlist.save', { title: product.title }),
      remove: t('wishlist.remove', { title: product.title }),
      saving: t('wishlist.saving'),
      removing: t('wishlist.removing'),
      signedOut: t('wishlist.signedOut'),
      invalid: t('wishlist.invalid'),
      failed: t('wishlist.failed')
    }
  };

  return (
    <ProductCardView
      product={product}
      locale={locale}
      labels={labels}
      commerceState="ready"
      eagerImage={eagerImage}
      initiallyWishlisted={initiallyWishlisted}
    />
  );
}
