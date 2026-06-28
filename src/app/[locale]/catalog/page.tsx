import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogControls } from '@/components/catalog/catalog-controls';
import { CatalogFilterContent } from '@/components/catalog/catalog-filter-content';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCard } from '@/components/catalog/product-card';
import { Sheet } from '@/components/ui/sheet';
import { getRequestMarket } from '@/catalog/page-context';
import { catalogListState } from '@/catalog/list-state';
import { getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { getWishlistedProductIds } from '@/account/wishlist';
import { getRequestUser } from '@/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCatalogPath, type Locale } from '@/i18n/routing';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function catalogHref(basePath: string, state: ReturnType<typeof catalogListState>, type?: string) {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (type) params.set('type', type);
  if (state.categorySlug) params.set('category', state.categorySlug);
  if (state.sort !== 'newest') params.set('sort', state.sort);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default async function CatalogPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: SearchParams;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const state = catalogListState(query);
  const requestUser = getRequestUser();
  const [market, t] = await Promise.all([getRequestMarket(), getTranslations('catalog')]);
  const [products, facets] = await Promise.all([
    getCachedCatalogProducts({
      locale,
      market,
      search: state.search,
      productType: state.productType,
      categorySlug: state.categorySlug,
      sort: state.sort
    }),
    getCachedCatalogFacets(locale, market)
  ]);
  const supabase = await createSupabaseServerClient();
  const user = await requestUser;
  const wishlistedProductIds = await getWishlistedProductIds({
    userId: user?.id,
    productIds: products.map((product) => product.product_id),
    client: supabase as never
  });
  const basePath = getCatalogPath(locale);
  const categories = facets.filter((facet) => facet.facet_type === 'category');
  const filterLabels = { category: t('categoryLabel'), allCategories: t('allCategories') };
  const tabs = [
    { label: t('allTypes'), type: undefined },
    { label: t('handmadeTab'), type: 'physical_finished' },
    { label: t('patternsTab'), type: 'pdf_pattern' }
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1280px] gap-7 px-4 py-8 sm:px-6 lg:px-10">
      <nav
        aria-label={t('breadcrumb')}
        className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"
      >
        <a href={`/${locale}`} className="hover:text-[var(--foreground)]">
          {t('breadcrumbHome')}
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t('breadcrumbShop')}</span>
      </nav>
      <header className="grid max-w-[760px] gap-2">
        <h1 className="text-3xl font-semibold leading-tight">{t('title')}</h1>
        <p className="text-[var(--muted-foreground)]">{t('intro')}</p>
      </header>
      <div
        className="flex gap-1 overflow-x-auto border-b border-[var(--border)]"
        aria-label={t('productType')}
      >
        {tabs.map((tab) => {
          const active = state.productType === tab.type;
          return (
            <a
              key={tab.label}
              href={catalogHref(basePath, state, tab.type)}
              aria-current={active ? 'page' : undefined}
              className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold aria-[current=page]:border-[var(--accent)] aria-[current=page]:text-[var(--accent)]"
            >
              {tab.label}
            </a>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className="hidden border-r border-[var(--border)] pr-6 lg:block"
          aria-label={t('filtersTitle')}
        >
          <CatalogFilterContent
            basePath={basePath}
            state={state}
            categories={categories}
            labels={filterLabels}
          />
        </aside>
        <div className="grid min-w-0 content-start gap-6">
          <div className="grid gap-3">
            <div className="lg:hidden">
              <Sheet
                triggerLabel={t('openFilters')}
                title={t('filtersTitle')}
                closeLabel={t('closeFilters')}
                showTriggerLabel
              >
                <CatalogFilterContent
                  basePath={basePath}
                  state={state}
                  categories={categories}
                  labels={filterLabels}
                />
              </Sheet>
            </div>
            <div className="min-w-0">
              <CatalogControls state={state} />
            </div>
          </div>
          <p data-testid="catalog-result-count" className="text-sm text-[var(--muted-foreground)]">
            {t('resultCount', { count: products.length })}
          </p>
          {products.length ? (
            <CatalogResultGrid
              resultKey={JSON.stringify(state)}
              labels={{ showing: t.raw('showingCount'), loadMore: t('loadMore') }}
            >
              {products.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  locale={locale}
                  initiallyWishlisted={wishlistedProductIds.has(product.product_id)}
                />
              ))}
            </CatalogResultGrid>
          ) : (
            <section className="grid min-h-52 place-content-center gap-3 text-center">
              <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
              <p className="text-[var(--muted-foreground)]">{t('emptyBody')}</p>
              <a href={basePath} className="font-semibold text-[var(--accent)]">
                {t('clearFilters')}
              </a>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
