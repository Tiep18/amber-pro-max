import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { getRequestMarket } from '@/catalog/page-context';
import { getCachedCatalogCategory, getCachedCatalogProducts } from '@/catalog/public-cache';
import { getWishlistedProductIds } from '@/account/wishlist';
import { ProductCard } from '@/components/catalog/product-card';
import { getCategoryPath, type Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

type Params = Promise<{ locale: Locale; categorySlug: string }>;

function slugs(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, string>;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const market = await getRequestMarket();
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

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale, categorySlug } = await params;
  setRequestLocale(locale);
  const market = await getRequestMarket();
  const [category, products] = await Promise.all([
    getCachedCatalogCategory(locale, market, categorySlug),
    getCachedCatalogProducts({ locale, market, categorySlug })
  ]);
  if (!category) {
    notFound();
  }
  const supabase = await createSupabaseServerClient();
  const { data: authUser } = await supabase.auth.getUser();
  const wishlistedProductIds = await getWishlistedProductIds({
    userId: authUser.user?.id,
    productIds: products.map((product) => product.product_id),
    client: supabase as never
  });

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
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
            initiallyWishlisted={wishlistedProductIds.has(product.product_id)}
          />
        ))}
      </section>
    </main>
  );
}
