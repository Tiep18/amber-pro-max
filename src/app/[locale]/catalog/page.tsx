import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CatalogControls } from '@/components/catalog/catalog-controls';
import { CatalogFilterContent } from '@/components/catalog/catalog-filter-content';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCard } from '@/components/catalog/product-card';
import { Sheet } from '@/components/ui/sheet';
import { localizedMetadata } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import { catalogListState } from '@/catalog/list-state';
import { getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import { getCatalogPath, type Locale } from '@/i18n/routing';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 300;

function catalogHref(basePath: string, state: ReturnType<typeof catalogListState>, type?: string) {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (type) params.set('type', type);
  if (state.categorySlug) params.set('category', state.categorySlug);
  if (state.sort !== 'newest') params.set('sort', state.sort);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const hasFacets = Object.keys(query).length > 0;
  return {
    ...localizedMetadata({
      title: locale === 'vi' ? 'Cua hang amigurumi | Ambertinybear' : 'Amigurumi shop | Ambertinybear',
      description:
        locale === 'vi'
          ? 'Kham pha mau PDF crochet va san pham amigurumi thu cong trong cua hang Ambertinybear.'
          : 'Browse crochet PDF patterns and handmade amigurumi products from Ambertinybear.',
      canonicalPath: getCatalogPath(locale),
      alternatePaths: {
        vi: getCatalogPath('vi'),
        en: getCatalogPath('en')
      }
    }),
    robots: hasFacets ? { index: false, follow: true } : undefined
  };
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
  const market = marketForLocale(locale);
  const t = await getTranslations('catalog');
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
  const basePath = getCatalogPath(locale);
  const categories = facets.filter((facet) => facet.facet_type === 'category');
  const filterLabels = { category: t('categoryLabel'), allCategories: t('allCategories') };
  const tabs = [
    { label: t('allTypes'), type: undefined },
    { label: t('handmadeTab'), type: 'physical_finished' },
    { label: t('patternsTab'), type: 'pdf_pattern' }
  ];

  return (
    <main className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:gap-5 lg:px-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: t('breadcrumbShop'), path: basePath }
          ]),
          itemListJsonLd(products.map((product) => ({ name: product.title, path: `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${product.slug}` })))
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
      <header className="grid max-w-[760px] gap-1">
        <h1 className="text-[28px] font-semibold leading-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">{t('intro')}</p>
      </header>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-[var(--border)]"
        aria-label={t('productType')}
      >
        {tabs.map((tab) => {
          const active = state.productType === tab.type;
          return (
            <Link
              key={tab.label}
              href={catalogHref(basePath, state, tab.type)}
              aria-current={active ? 'page' : undefined}
              transitionTypes={active ? undefined : ['catalog-filter']}
              className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold aria-[current=page]:border-[var(--accent)] aria-[current=page]:text-[var(--accent)] sm:px-4"
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
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
        <div className="grid min-w-0 content-start gap-4">
          <div className="grid gap-2">
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
                />
              ))}
            </CatalogResultGrid>
          ) : (
            <section className="grid min-h-52 place-content-center gap-3 text-center">
              <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
              <p className="text-[var(--muted-foreground)]">{t('emptyBody')}</p>
              <Link href={basePath} className="font-semibold text-[var(--accent)]">
                {t('clearFilters')}
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
