import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import { getCachedCatalogCategory, getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { ProductCard } from '@/components/catalog/product-card';
import { getCatalogPath, getCategoryPath, type Locale } from '@/i18n/routing';
import type { Json } from '@/types/supabase';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import Link from 'next/link';
import { ArrowLeft, PackageSearch, Sparkles } from 'lucide-react';

type Params = Promise<{ locale: Locale; categorySlug: string }>;

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
    eyebrow: 'Category',
    count: 'products',
    empty: 'No products are currently published in this category for your market.',
    back: 'Back to shop',
    market: 'Shown with current market availability'
  },
  vi: {
    eyebrow: 'Danh muc',
    count: 'san pham',
    empty: 'Chua co san pham cong khai trong danh muc nay cho thi truong cua ban.',
    back: 'Quay lai cua hang',
    market: 'Hien theo kha dung cua thi truong hien tai'
  }
} as const;

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
  const t = copy[locale];

  return (
    <main className="container grid gap-8 py-10 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: category.name, path: getCategoryPath(locale, category.slug) }
          ]),
          itemListJsonLd(products.map((product) => ({ name: product.title, path: `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${product.slug}` })))
        ]}
      />
      <header className="grid gap-6 rounded-[24px] bg-[var(--surface-muted)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.32fr)] lg:items-end">
        <div className="grid max-w-[820px] gap-3">
          <Link href={getCatalogPath(locale)} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t.back}
          </Link>
          <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="text-[40px] font-semibold leading-[1.02] sm:text-[56px]">{category.name}</h1>
          <p className="max-w-[64ch] text-base leading-7 text-[var(--muted-foreground)]">{category.description}</p>
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
      {products.length ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              locale={locale}
            />
          ))}
        </section>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <div className="grid max-w-[360px] justify-items-center gap-3">
            <PackageSearch className="h-8 w-8 text-[var(--accent)]" aria-hidden="true" />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.empty}</p>
          </div>
        </div>
      )}
    </main>
  );
}
