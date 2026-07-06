import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CatalogControls } from '@/components/catalog/catalog-controls';
import { CatalogFilterContent } from '@/components/catalog/catalog-filter-content';
import { CatalogMobileFilters } from '@/components/catalog/catalog-mobile-filters';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCard } from '@/components/catalog/product-card';
import { localizedMetadata } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import { catalogListState, hasCatalogFilters, type CatalogListState } from '@/catalog/list-state';
import { getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import { getCatalogPath, type Locale } from '@/i18n/routing';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 300;

type CatalogHrefOverrides = {
  search?: string | null;
  type?: CatalogListState['productType'] | null;
  categorySlug?: string | null;
  sort?: CatalogListState['sort'] | null;
};

function catalogHref(
  basePath: string,
  state: CatalogListState,
  overrides: CatalogHrefOverrides = {}
) {
  const params = new URLSearchParams();
  const search = 'search' in overrides ? overrides.search : state.search;
  const type = 'type' in overrides ? overrides.type : state.productType;
  const categorySlug = 'categorySlug' in overrides ? overrides.categorySlug : state.categorySlug;
  const sort = 'sort' in overrides ? overrides.sort : state.sort;

  if (search) params.set('search', search);
  if (type) params.set('type', type);
  if (categorySlug) params.set('category', categorySlug);
  if (sort && sort !== 'newest') params.set('sort', sort);
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
  const categoryBySlug = new Map(categories.map((facet) => [facet.slug, facet.label]));
  const filterLabels = { category: t('categoryLabel'), allCategories: t('allCategories') };
  const tabs = [
    { label: t('allTypes'), type: undefined },
    { label: t('handmadeTab'), type: 'physical_finished' },
    { label: t('patternsTab'), type: 'pdf_pattern' }
  ] as const;
  const sortLabels: Record<CatalogListState['sort'], string> = {
    newest: t('newest'),
    price_asc: t('priceAsc'),
    price_desc: t('priceDesc'),
    title: t('titleSort')
  };
  const activeFilters = [
    state.search
      ? {
          key: 'search',
          label: t('filterSearch', { value: state.search }),
          href: catalogHref(basePath, state, { search: null })
        }
      : null,
    state.productType
      ? {
          key: 'type',
          label: t('filterType', {
            value: tabs.find((tab) => tab.type === state.productType)?.label ?? state.productType
          }),
          href: catalogHref(basePath, state, { type: null })
        }
      : null,
    state.categorySlug
      ? {
          key: 'category',
          label: t('filterCategory', {
            value: categoryBySlug.get(state.categorySlug) ?? state.categorySlug
          }),
          href: catalogHref(basePath, state, { categorySlug: null })
        }
      : null,
    state.sort !== 'newest'
      ? {
          key: 'sort',
          label: t('filterSort', { value: sortLabels[state.sort] }),
          href: catalogHref(basePath, state, { sort: 'newest' })
        }
      : null
  ].filter((filter): filter is { key: string; label: string; href: string } => Boolean(filter));

  return (
    <main className="container grid gap-4 py-5 sm:py-6 lg:gap-5">
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
      <header className="grid max-w-[760px] gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight text-balance text-[var(--brand)] sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
          {t('intro')}
        </p>
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
              href={catalogHref(basePath, state, { type: tab.type ?? null })}
              aria-current={active ? 'page' : undefined}
              transitionTypes={active ? undefined : ['catalog-filter']}
              className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold aria-[current=page]:border-[var(--accent)] aria-[current=page]:text-[var(--accent)] sm:px-4"
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <aside
          className="hidden self-start border-r border-[var(--border)]/70 pr-5 lg:sticky lg:top-24 lg:block"
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
          <div className="grid gap-2 lg:sticky lg:top-20 lg:z-20 lg:-mx-2 lg:bg-[var(--background)]/94 lg:px-2 lg:py-2 lg:backdrop-blur-md">
            <div className="flex min-w-0 items-end gap-2">
              <div className="min-w-0 flex-1">
              <CatalogControls state={state} />
              </div>
              <div className="shrink-0 lg:hidden">
                <CatalogMobileFilters
                  triggerLabel={t('openFilters')}
                  title={t('filtersTitle')}
                  closeLabel={t('closeFilters')}
                >
                  <CatalogFilterContent
                    basePath={basePath}
                    state={state}
                    categories={categories}
                    labels={filterLabels}
                  />
                </CatalogMobileFilters>
              </div>
            </div>
            {activeFilters.length ? (
              <section
                aria-label={t('activeFiltersLabel')}
                className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
              >
                {activeFilters.map((filter) => (
                  <Link
                    key={filter.key}
                    href={filter.href}
                    transitionTypes={['catalog-filter']}
                    className="inline-flex min-h-7 max-w-[16rem] shrink-0 items-center rounded-full bg-[var(--surface-muted)]/58 px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)] transition duration-200 hover:bg-[var(--surface-blush)] hover:text-[var(--accent)] active:scale-[0.98]"
                  >
                    <span className="min-w-0 truncate">{filter.label}</span>
                    <span aria-hidden="true" className="ml-1.5 text-[var(--accent)]">
                      x
                    </span>
                  </Link>
                ))}
                {hasCatalogFilters(state) ? (
                  <Link
                    href={basePath}
                    transitionTypes={['catalog-filter']}
                    className="inline-flex min-h-7 shrink-0 items-center px-1 text-xs font-semibold text-[var(--accent)] transition duration-200 hover:text-[var(--accent-hover)]"
                  >
                    {t('clearFilters')}
                  </Link>
                ) : null}
              </section>
            ) : null}
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
