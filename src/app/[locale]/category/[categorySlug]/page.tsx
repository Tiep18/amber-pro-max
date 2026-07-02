import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import { getCachedCatalogCategory, getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { ProductCard } from '@/components/catalog/product-card';
import { getCategoryPath, type Locale } from '@/i18n/routing';
import type { Json } from '@/types/supabase';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';

type Params = Promise<{ locale: Locale; categorySlug: string }>;

export const revalidate = 300;
export const dynamic = 'force-static';

function slugs(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, string>;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const market = marketForLocale(locale);
  const category = await getCachedCatalogCategory(locale, market, categorySlug);
  if (!category) {
    return {};
  }
  const localized = slugs(category.localized_slugs);
  if (!localized.vi || !localized.en) {
    return {};
  }
  return localizedMetadata({
    title: category.seo_title || category.name,
    description: category.seo_description || category.description,
    canonicalPath: getCategoryPath(locale, category.slug),
    alternatePaths: {
      vi: getCategoryPath('vi', localized.vi),
      en: getCategoryPath('en', localized.en)
    },
    socialImage: publicStorageUrl(category.social_image_bucket, category.social_image_path)
  });
}

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const facets = await getCachedCatalogFacets(locale, marketForLocale(locale));
      return facets
        .filter((facet) => facet.facet_type === 'category')
        .map((facet) => ({ locale, categorySlug: facet.slug }));
    })
  );
  return entries.flat();
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, categorySlug } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale);
  const [category, products] = await Promise.all([
    getCachedCatalogCategory(locale, market, categorySlug),
    getCachedCatalogProducts({ locale, market, categorySlug })
  ]);
  if (!category) {
    notFound();
  }

  return (
    <main className="container grid gap-7 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: category.name, path: getCategoryPath(locale, category.slug) }
          ]),
          itemListJsonLd(products.map((product) => ({ name: product.title, path: `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${product.slug}` })))
        ]}
      />
      <header className="grid max-w-[760px] gap-3">
        <h1 className="text-[30px] font-semibold leading-tight">{category.name}</h1>
        <p className="text-[var(--muted-foreground)]">{category.description}</p>
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
