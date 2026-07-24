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
      locale === 'vi' ? 'Cua hang amigurumi | Ambertinybear' : 'Amigurumi shop | Ambertinybear',
    description:
      locale === 'vi'
        ? 'Kham pha mau PDF crochet va san pham amigurumi thu cong trong cua hang Ambertinybear.'
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
          technique: 'Ky thuat',
          allTechniques: 'Tat ca ky thuat',
          tag: 'The',
          allTags: 'Tat ca the',
          resultCount: '{count} san pham',
          filterTechnique: 'Ky thuat: {value}',
          filterTag: 'The: {value}',
          resolving: 'Dang tai cua hang...',
          loaded: 'Da tai cua hang {market}. {count} san pham.',
          errorTitle: 'Khong the cap nhat cua hang.',
          errorBody: 'Gia va tinh trang hang co the da cu. Hay thu lai truoc khi mua.',
          retry: 'Thu lai',
          emptyTitle: 'Khong co san pham phu hop voi khu vuc va bo loc nay.',
          emptyBody: 'Hay doi bo loc hoac chon khu vuc mua sam khac de xem them san pham.',
          noFilters: 'khong co bo loc',
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
        save: copy.saveWishlist,
        remove: copy.removeWishlist,
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
    <main className="container grid gap-4 py-5 sm:py-6 lg:gap-5">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
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
      <nav
        aria-label={t('breadcrumb')}
        className="hidden items-center gap-2 text-sm text-[var(--muted-foreground)] sm:flex"
      >
        <Link href={`/${locale}`} className="hover:text-[var(--foreground)]">
          {t('breadcrumbHome')}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t('breadcrumbShop')}</span>
      </nav>
      <header className="grid max-w-[760px] gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight text-balance text-[var(--brand)] sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
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
