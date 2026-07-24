import { Suspense } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
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
import {
  getCatalogPath,
  getProductPath,
  getTechniquePath,
  type Locale
} from '@/i18n/routing';
import { LocalizedRouteSlugs } from '@/components/localized-route-context';

type Params = Promise<{ locale: Locale; techniqueSlug: string }>;

export const dynamic = 'force-static';
export const revalidate = 300;

const copy = {
  en: {
    eyebrow: 'Technique',
    count: 'products',
    back: 'Back to shop',
    market: 'Products using this technique in the default catalog.',
    description: (label: string) =>
      `Discover handmade products and crochet patterns made with ${label}.`
  },
  vi: {
    eyebrow: 'Ky thuat',
    count: 'san pham',
    back: 'Quay lai cua hang',
    market: 'San pham dung ky thuat nay trong cua hang mac dinh.',
    description: (label: string) =>
      `Kham pha san pham thu cong va mau crochet su dung ky thuat ${label}.`
  }
} as const;

function projectionInput(
  locale: Locale,
  market: MarketCode,
  techniqueSlug: string | null
): CatalogProjectionInput {
  return {
    locale,
    market,
    surface: 'technique',
    search: null,
    productType: null,
    categorySlug: null,
    collectionSlug: null,
    techniqueSlug,
    tagSlug: null,
    sort: 'newest',
    limit: 48
  };
}

async function techniqueProjections(locale: Locale, techniqueSlug: string | null) {
  return Promise.all([
    getCachedCatalogProjection(projectionInput(locale, 'vn', techniqueSlug)),
    getCachedCatalogProjection(projectionInput(locale, 'intl', techniqueSlug))
  ]);
}

function techniqueFacet(
  projections: Awaited<ReturnType<typeof techniqueProjections>>,
  techniqueSlug: string
) {
  return projections
    .flatMap((projection) => projection.facets)
    .find(
      (facet) => facet.facet_type === 'technique' && facet.slug === techniqueSlug
    );
}

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const [vnProjection, intlProjection] = await techniqueProjections(locale, null);
      const facets = new Map(
        [...vnProjection.facets, ...intlProjection.facets]
          .filter((facet) => facet.facet_type === 'technique')
          .map((facet) => [facet.slug, facet] as const)
      );
      return [...facets.values()].map((facet) => ({
        locale,
        techniqueSlug: facet.slug
      }));
    })
  );
  return entries.flat();
}

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, techniqueSlug } = await params;
  const projections = await techniqueProjections(locale, techniqueSlug);
  const facet = techniqueFacet(projections, techniqueSlug);
  if (!facet) return {};

  return localizedMetadata({
    title:
      locale === 'vi'
        ? `${facet.label} | Ky thuat amigurumi`
        : `${facet.label} | Amigurumi technique`,
    description: copy[locale].description(facet.label),
    canonicalPath: getTechniquePath(locale, techniqueSlug),
    alternatePaths: {
      vi: getTechniquePath('vi', techniqueSlug),
      en: getTechniquePath('en', techniqueSlug)
    }
  });
}

export default async function TechniquePage({ params }: { params: Params }) {
  const { locale, techniqueSlug } = await params;
  setRequestLocale(locale);
  const projections = await techniqueProjections(locale, techniqueSlug);
  const facet = techniqueFacet(projections, techniqueSlug);
  if (!facet) notFound();

  const market = marketForLocale(locale);
  const seoProjection = market === 'vn' ? projections[0] : projections[1];
  const products = seoProjection.products;
  const labels = await getTaxonomyCommerceLabels(locale);
  const t = copy[locale];

  return (
    <main className="container grid gap-8 py-10 sm:py-12">
      <LocalizedRouteSlugs
        path={getTechniquePath(locale, techniqueSlug)}
        slugs={{ vi: techniqueSlug, en: techniqueSlug }}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: facet.label, path: getTechniquePath(locale, techniqueSlug) }
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
            <Sparkles className="h-4 w-4" aria-hidden="true" />
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
          surface="technique"
          seoProducts={products}
          labels={labels}
          fixedFilters={{ techniqueSlug }}
        />
      </Suspense>
    </main>
  );
}
