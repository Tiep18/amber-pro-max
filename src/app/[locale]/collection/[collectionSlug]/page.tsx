import { Suspense } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import {
  getCachedCatalogCollection,
  getCachedCatalogFacets,
  getCachedCatalogProducts
} from '@/catalog/public-cache';
import { CatalogCommerce } from '@/components/catalog/catalog-commerce';
import {
  getTaxonomyCommerceLabels,
  TaxonomyCommercePending
} from '@/components/catalog/taxonomy-commerce';
import { getCatalogPath, getCollectionPath, getProductPath, type Locale } from '@/i18n/routing';
import type { Json } from '@/types/supabase';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import Link from 'next/link';
import { ArrowLeft, Boxes } from 'lucide-react';

type Params = Promise<{ locale: Locale; collectionSlug: string }>;

export const revalidate = 300;
export const dynamic = 'force-static';

function slugs(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, string>;
}

const copy = {
  en: {
    eyebrow: 'Collection',
    count: 'products',
    empty: 'No products are currently published in this collection for your market.',
    back: 'Back to shop',
    market: 'Curated with current market availability'
  },
  vi: {
    eyebrow: 'Bo suu tap',
    count: 'san pham',
    empty: 'Chua co san pham cong khai trong bo suu tap nay cho thi truong cua ban.',
    back: 'Quay lai cua hang',
    market: 'Tuyen chon theo kha dung cua thi truong hien tai'
  }
} as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, collectionSlug } = await params;
  const market = marketForLocale(locale);
  const collection = await getCachedCatalogCollection(locale, market, collectionSlug);
  if (!collection) {
    return {};
  }
  const localized = slugs(collection.localized_slugs);
  if (!localized.vi || !localized.en) {
    return {};
  }
  return localizedMetadata({
    title: collection.seo_title || collection.name,
    description: collection.seo_description || collection.description,
    canonicalPath: getCollectionPath(locale, collection.slug),
    alternatePaths: {
      vi: getCollectionPath('vi', localized.vi),
      en: getCollectionPath('en', localized.en)
    },
    socialImage: publicStorageUrl(collection.social_image_bucket, collection.social_image_path)
  });
}

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const [vnFacets, intlFacets] = await Promise.all([
        getCachedCatalogFacets(locale, 'vn'),
        getCachedCatalogFacets(locale, 'intl')
      ]);
      const facets = new Map(
        [...vnFacets, ...intlFacets]
        .filter((facet) => facet.facet_type === 'collection')
          .map((facet) => [facet.slug, facet] as const)
      );
      return [...facets.values()].map((facet) => ({ locale, collectionSlug: facet.slug }));
    })
  );
  return entries.flat();
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { locale, collectionSlug } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale);
  const [collection, products] = await Promise.all([
    getCachedCatalogCollection(locale, market, collectionSlug),
    getCachedCatalogProducts({ locale, market, collectionSlug })
  ]);
  if (!collection) {
    notFound();
  }
  const t = copy[locale];
  const labels = await getTaxonomyCommerceLabels(locale);

  return (
    <main className="container grid gap-8 py-10 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: collection.name, path: getCollectionPath(locale, collection.slug) }
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
          <Link href={getCatalogPath(locale)} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t.back}
          </Link>
          <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="text-[40px] font-semibold leading-[1.02] sm:text-[56px]">{collection.name}</h1>
          <p className="max-w-[64ch] text-base leading-7 text-[var(--muted-foreground)]">{collection.description}</p>
        </div>
        <aside className="grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
            <Boxes className="h-4 w-4" aria-hidden="true" />
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
          surface="collection"
          seoProducts={products}
          labels={labels}
          fixedFilters={{ collectionSlug }}
        />
      </Suspense>
    </main>
  );
}
