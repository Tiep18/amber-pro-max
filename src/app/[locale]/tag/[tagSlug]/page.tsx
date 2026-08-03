import { Suspense } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tags } from 'lucide-react';
import { localizedMetadata } from '@/catalog/metadata';
import type { MarketCode } from '@/catalog/market';
import { getCachedCatalogProjection } from '@/catalog/public-cache';
import type { CatalogProjectionInput } from '@/catalog/projections';
import { marketForLocale } from '@/catalog/seo-market';
import { CatalogCommerce } from '@/components/catalog/catalog-commerce';
import {
  getTaxonomyCommerceLabels,
  TaxonomyCommercePending
} from '@/components/catalog/taxonomy-commerce';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import { getCatalogPath, getProductPath, getTagPath, type Locale } from '@/i18n/routing';
import { LocalizedRouteSlugs } from '@/components/localized-route-context';

type Params = Promise<{ locale: Locale; tagSlug: string }>;

export const dynamic = 'force-static';
export const revalidate = 300;

const copy = {
  en: {
    eyebrow: 'Tag',
    count: 'products',
    back: 'Back to shop',
    market: 'Products with this tag in the default catalog.',
    description: (label: string) =>
      `Browse handmade products and crochet patterns tagged ${label}.`
  },
  vi: {
    eyebrow: 'Thẻ',
    count: 'sản phẩm',
    back: 'Quay lại cửa hàng',
    market: 'Sản phẩm có thẻ này trong cửa hàng mặc định.',
    description: (label: string) =>
      `Khám phá sản phẩm thủ công và mẫu crochet gắn thẻ ${label}.`
  }
} as const;

function projectionInput(
  locale: Locale,
  market: MarketCode,
  tagSlug: string | null
): CatalogProjectionInput {
  return {
    locale,
    market,
    surface: 'tag',
    search: null,
    productType: null,
    categorySlug: null,
    collectionSlug: null,
    techniqueSlug: null,
    tagSlug,
    sort: 'newest',
    offset: 0,
    limit: 48
  };
}

async function tagProjections(locale: Locale, tagSlug: string | null) {
  return Promise.all([
    getCachedCatalogProjection(projectionInput(locale, 'vn', tagSlug)),
    getCachedCatalogProjection(projectionInput(locale, 'intl', tagSlug))
  ]);
}

function tagFacet(projections: Awaited<ReturnType<typeof tagProjections>>, tagSlug: string) {
  return projections
    .flatMap((projection) => projection.facets)
    .find((facet) => facet.facet_type === 'tag' && facet.slug === tagSlug);
}

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const [vnProjection, intlProjection] = await tagProjections(locale, null);
      const facets = new Map(
        [...vnProjection.facets, ...intlProjection.facets]
          .filter((facet) => facet.facet_type === 'tag')
          .map((facet) => [facet.slug, facet] as const)
      );
      return [...facets.values()].map((facet) => ({ locale, tagSlug: facet.slug }));
    })
  );
  return entries.flat();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, tagSlug } = await params;
  const projections = await tagProjections(locale, tagSlug);
  const facet = tagFacet(projections, tagSlug);
  if (!facet) return {};

  return localizedMetadata({
    title: locale === 'vi' ? `${facet.label} | Thẻ sản phẩm` : `${facet.label} | Product tag`,
    description: copy[locale].description(facet.label),
    canonicalPath: getTagPath(locale, tagSlug),
    alternatePaths: {
      vi: getTagPath('vi', tagSlug),
      en: getTagPath('en', tagSlug)
    }
  });
}

export default async function TagPage({ params }: { params: Params }) {
  const { locale, tagSlug } = await params;
  setRequestLocale(locale);
  const projections = await tagProjections(locale, tagSlug);
  const facet = tagFacet(projections, tagSlug);
  if (!facet) notFound();

  const market = marketForLocale(locale);
  const seoProjection = market === 'vn' ? projections[0] : projections[1];
  const products = seoProjection.products;
  const labels = await getTaxonomyCommerceLabels(locale);
  const t = copy[locale];

  return (
    <main className="container grid gap-8 py-10 sm:py-12">
      <LocalizedRouteSlugs
        path={getTagPath(locale, tagSlug)}
        slugs={{ vi: tagSlug, en: tagSlug }}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chủ' : 'Home', path: `/${locale}` },
            { name: facet.label, path: getTagPath(locale, tagSlug) }
          ]),
          itemListJsonLd(
            products.map((product) => ({
              name: product.title,
              path: getProductPath(locale, product.slug)
            }))
          )
        ]}
      />
      <header className="grid gap-6 rounded-[24px] bg-[var(--surface-muted)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.32fr)] lg:items-end">
        <div className="grid max-w-[820px] gap-3">
          <Link
            href={getCatalogPath(locale)}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t.back}
          </Link>
          <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="text-[40px] font-semibold leading-[1.02] sm:text-[56px]">
            {facet.label}
          </h1>
          <p className="max-w-[64ch] text-base leading-7 text-[var(--muted-foreground)]">
            {t.description(facet.label)}
          </p>
        </div>
        <aside className="grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
            <Tags className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="font-semibold">
            {products.length} {t.count}
          </p>
          <p className="leading-6 text-[var(--muted-foreground)]">{t.market}</p>
        </aside>
      </header>
      <Suspense
        fallback={
          <TaxonomyCommercePending locale={locale} products={products} labels={labels} />
        }
      >
        <CatalogCommerce
          locale={locale}
          surface="tag"
          seoProducts={products}
          labels={labels}
          fixedFilters={{ tagSlug }}
        />
      </Suspense>
    </main>
  );
}
