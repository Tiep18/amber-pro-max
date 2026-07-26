import { getTranslations } from 'next-intl/server';
import type { CatalogProduct } from '@/catalog/queries';
import type { CatalogCommerceLabels } from '@/components/catalog/catalog-commerce';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCardView } from '@/components/catalog/product-card-view';
import type { Locale } from '@/i18n/routing';

export async function getTaxonomyCommerceLabels(
  locale: Locale
): Promise<CatalogCommerceLabels> {
  const t = await getTranslations('catalog');
  const copy =
    locale === 'vi'
      ? {
          technique: 'Ky thuat',
          allTechniques: 'Tat ca ky thuat',
          tag: 'The',
          allTags: 'Tat ca the',
          resolving: 'Dang tai san pham...',
          loaded: 'Da tai san pham cho thi truong {market}. {count} san pham.',
          errorTitle: 'Khong the cap nhat san pham.',
          errorBody: 'Gia va tinh trang hang co the da cu. Hay thu lai truoc khi mua.',
          retry: 'Thu lai',
          emptyTitle: 'Khong co san pham phu hop voi thi truong nay.',
          emptyBody: 'Thu chon khu vuc mua sam khac de xem them san pham.',
          noFilters: 'trang kham pha nay',
          marketNames: { vn: 'Viet Nam', intl: 'quoc te' },
          saveWishlist: 'Luu san pham vao yeu thich',
          removeWishlist: 'Xoa san pham khoi yeu thich',
          placeholderStatus: 'Dang cap nhat anh'
        }
      : {
          technique: 'Technique',
          allTechniques: 'All techniques',
          tag: 'Tag',
          allTags: 'All tags',
          resolving: 'Loading products...',
          loaded: '{market} products loaded. {count} products.',
          errorTitle: 'We could not update these products.',
          errorBody: 'Prices and availability may be out of date. Try again before shopping.',
          retry: 'Try again',
          emptyTitle: 'No products match this shopping region.',
          emptyBody: 'Choose another shopping region to see more products.',
          noFilters: 'this discovery page',
          marketNames: { vn: 'Vietnam', intl: 'International' },
          saveWishlist: 'Save product to wishlist',
          removeWishlist: 'Remove product from wishlist',
          placeholderStatus: 'Image coming soon'
        };

  return {
    card: {
      viewProduct: t('viewProduct'),
      pdfPattern: t('pdfPattern'),
      finishedItem: t('finishedItem'),
      inStock: t('inStock'),
      outOfStock: t('outOfStock'),
      placeholder: {
        brand: 'Ambertinybear',
        status: copy.placeholderStatus
      },
      wishlist: {
        save: String(t.raw('wishlist.save')),
        remove: String(t.raw('wishlist.remove')),
        saving: t('wishlist.saving'),
        removing: t('wishlist.removing'),
        signedOut: t('wishlist.signedOut'),
        invalid: t('wishlist.invalid'),
        failed: t('wishlist.failed')
      }
    },
    filters: {
      category: t('categoryLabel'),
      allCategories: t('allCategories'),
      technique: copy.technique,
      allTechniques: copy.allTechniques,
      tag: copy.tag,
      allTags: copy.allTags
    },
    resolving: copy.resolving,
    loaded: copy.loaded,
    showing: String(t.raw('showingCount')),
    loadMore: t('loadMore'),
    errorTitle: copy.errorTitle,
    errorBody: copy.errorBody,
    retry: copy.retry,
    emptyTitle: copy.emptyTitle,
    emptyBody: copy.emptyBody,
    noFilters: copy.noFilters,
    marketNames: copy.marketNames
  };
}

export function TaxonomyCommercePending({
  locale,
  products,
  labels
}: {
  locale: Locale;
  products: readonly CatalogProduct[];
  labels: CatalogCommerceLabels;
}) {
  return (
    <section aria-busy="true" aria-label={labels.resolving} className="grid gap-4">
      <CatalogResultGrid
        resultKey={`taxonomy-pending:${locale}`}
        labels={{ showing: labels.showing, loadMore: labels.loadMore }}
      >
        {products.map((product, index) => (
          <ProductCardView
            key={product.product_id}
            product={product}
            locale={locale}
            labels={labels.card}
            commerceState="pending"
            eagerImage={index === 0}
          />
        ))}
      </CatalogResultGrid>
    </section>
  );
}
