import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CatalogCommerce, type CatalogCommerceLabels } from '@/components/catalog/catalog-commerce';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCardView } from '@/components/catalog/product-card-view';
import { localizedMetadata } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import { getCachedCatalogProducts } from '@/catalog/public-cache';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import { getCatalogPath, getProductPath, type Locale } from '@/i18n/routing';
import type { CatalogProduct } from '@/catalog/queries';

export const dynamic = 'force-static';
export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata({
    title:
      locale === 'vi' ? 'Cửa hàng amigurumi | Ambertinybear' : 'Amigurumi shop | Ambertinybear',
    description:
      locale === 'vi'
        ? 'Khám phá mẫu PDF crochet và sản phẩm amigurumi thủ công trong cửa hàng Ambertinybear.'
        : 'Browse crochet PDF patterns and handmade amigurumi products from Ambertinybear.',
    canonicalPath: getCatalogPath(locale),
    alternatePaths: {
      vi: getCatalogPath('vi'),
      en: getCatalogPath('en')
    }
  });
}

function catalogCommerceLabels(
  locale: Locale,
  t: Awaited<ReturnType<typeof getTranslations<'catalog'>>>
): CatalogCommerceLabels {
  const copy =
    locale === 'vi'
      ? {
          technique: 'Kỹ thuật',
          allTechniques: 'Tất cả kỹ thuật',
          tag: 'Thẻ',
          allTags: 'Tất cả thẻ',
          resultCount: '{count} sản phẩm',
          filterTechnique: 'Kỹ thuật: {value}',
          filterTag: 'Thẻ: {value}',
          resolving: 'Đang tải cửa hàng...',
          loaded: 'Đã tải cửa hàng {market}. {count} sản phẩm.',
          errorTitle: 'Không thể cập nhật cửa hàng.',
          errorBody: 'Giá và tình trạng hàng có thể đã cũ. Hãy thử lại trước khi mua.',
          retry: 'Thử lại',
          emptyTitle: 'Không có sản phẩm phù hợp với khu vực và bộ lọc này.',
          emptyBody: 'Hãy đổi bộ lọc hoặc chọn khu vực mua sắm khác để xem thêm sản phẩm.',
          noFilters: 'không có bộ lọc',
          marketNames: { vn: 'Việt Nam', intl: 'quốc tế' },
          saveWishlist: 'Lưu sản phẩm vào yêu thích',
          removeWishlist: 'Xóa sản phẩm khỏi yêu thích',
          placeholderStatus: 'Đang cập nhật ảnh',
          searchCategories: 'Tìm danh mục…',
          noMatchingCategories: 'Không tìm thấy danh mục phù hợp.'
        }
      : {
          technique: 'Technique',
          allTechniques: 'All techniques',
          tag: 'Tag',
          allTags: 'All tags',
          resultCount: '{count} products',
          filterTechnique: 'Technique: {value}',
          filterTag: 'Tag: {value}',
          resolving: 'Loading store...',
          loaded: '{market} store loaded. {count} products.',
          errorTitle: 'We could not update this store.',
          errorBody: 'Prices and availability may be out of date. Try again before shopping.',
          retry: 'Try again',
          emptyTitle: 'No products match this market and filters.',
          emptyBody: 'Change a filter or choose another shopping region to see more products.',
          noFilters: 'no filters',
          marketNames: { vn: 'Vietnam', intl: 'International' },
          saveWishlist: 'Save product to wishlist',
          removeWishlist: 'Remove product from wishlist',
          placeholderStatus: 'Image coming soon',
          searchCategories: 'Find a category…',
          noMatchingCategories: 'No matching categories.'
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
      allTags: copy.allTags,
      searchCategories: copy.searchCategories,
      noMatchingCategories: copy.noMatchingCategories
    },
    controls: {
      search: t('search'),
      searchPlaceholder: t('searchPlaceholder'),
      searchSubmit: t('searchSubmit'),
      sort: t('sort'),
      newest: t('newest'),
      priceAsc: t('priceAsc'),
      priceDesc: t('priceDesc'),
      titleSort: t('titleSort')
    },
    shell: {
      productType: t('productType'),
      allTypes: t('allTypes'),
      handmadeTab: t('handmadeTab'),
      patternsTab: t('patternsTab'),
      filtersTitle: t('filtersTitle'),
      openFilters: t('openFilters'),
      closeFilters: t('closeFilters'),
      resultCount: copy.resultCount,
      activeFilters: t('activeFiltersLabel'),
      clearFilters: t('clearFilters'),
      filterSearch: String(t.raw('filterSearch')),
      filterType: String(t.raw('filterType')),
      filterCategory: String(t.raw('filterCategory')),
      filterTechnique: copy.filterTechnique,
      filterTag: copy.filterTag,
      filterSort: String(t.raw('filterSort'))
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

function CatalogPending({
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
        resultKey={`pending:${locale}`}
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

export default async function CatalogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale);
  const t = await getTranslations('catalog');
  const products = await getCachedCatalogProducts({ locale, market, sort: 'newest' });
  const basePath = getCatalogPath(locale);
  const labels = catalogCommerceLabels(locale, t);

  return (
    <main className="container grid gap-3 py-4 sm:py-5 lg:gap-4">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chủ' : 'Home', path: `/${locale}` },
            { name: t('breadcrumbShop'), path: basePath }
          ]),
          itemListJsonLd(
            products.map((product) => ({
              name: product.title,
              path: getProductPath(locale, product.slug)
            }))
          )
        ]}
      />
      <header className="flex flex-col gap-2 border-b border-[var(--border)]/40 pb-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="grid gap-1">
          <nav
            aria-label={t('breadcrumb')}
            className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"
          >
            <Link href={`/${locale}`} className="transition-colors hover:text-[var(--foreground)]">
              {t('breadcrumbHome')}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-medium text-[var(--foreground)]">{t('breadcrumbShop')}</span>
          </nav>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--brand)] sm:text-2xl">
            {t('title')}
          </h1>
        </div>
        <p className="max-w-[44ch] text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm sm:text-right">
          {t('intro')}
        </p>
      </header>
      <Suspense fallback={<CatalogPending locale={locale} products={products} labels={labels} />}>
        <CatalogCommerce
          locale={locale}
          surface="catalog"
          seoProducts={products}
          labels={labels}
          showControls
        />
      </Suspense>
    </main>
  );
}
