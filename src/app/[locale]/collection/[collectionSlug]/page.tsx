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
import { ProductCard } from '@/components/catalog/product-card';
import { getCollectionPath, type Locale } from '@/i18n/routing';
import type { Json } from '@/types/supabase';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';

type Params = Promise<{ locale: Locale; collectionSlug: string }>;

export const revalidate = 300;
export const dynamic = 'force-static';

function slugs(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, string>;
}

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
      const facets = await getCachedCatalogFacets(locale, marketForLocale(locale));
      return facets
        .filter((facet) => facet.facet_type === 'collection')
        .map((facet) => ({ locale, collectionSlug: facet.slug }));
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

  return (
    <main className="container grid gap-7 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: collection.name, path: getCollectionPath(locale, collection.slug) }
          ]),
          itemListJsonLd(products.map((product) => ({ name: product.title, path: `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${product.slug}` })))
        ]}
      />
      <header className="grid max-w-[760px] gap-3">
        <h1 className="text-[30px] font-semibold leading-tight">{collection.name}</h1>
        <p className="text-[var(--muted-foreground)]">{collection.description}</p>
      </header>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.product_id}
            product={product}
            locale={locale}
          />
        ))}
      </section>
    </main>
  );
}
