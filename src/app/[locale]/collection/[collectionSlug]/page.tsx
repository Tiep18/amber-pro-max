import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {localizedMetadata, publicStorageUrl} from '@/catalog/metadata';
import {getRequestMarket} from '@/catalog/page-context';
import {getCatalogCollectionBySlug, listCatalogProducts} from '@/catalog/queries';
import {getWishlistedProductIds} from '@/account/wishlist';
import {ProductCard} from '@/components/catalog/product-card';
import {getCollectionPath, type Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {Json} from '@/types/supabase';

type Params = Promise<{locale: Locale; collectionSlug: string}>;

function slugs(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, string>;
}

export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, collectionSlug} = await params;
  const market = await getRequestMarket();
  const collection = await getCatalogCollectionBySlug({locale, market, slug: collectionSlug});
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

export default async function CollectionPage({
  params
}: {
  params: Params;
}) {
  const {locale, collectionSlug} = await params;
  setRequestLocale(locale);
  const market = await getRequestMarket();
  const [collection, products] = await Promise.all([
    getCatalogCollectionBySlug({locale, market, slug: collectionSlug}),
    listCatalogProducts({locale, market, collectionSlug})
  ]);
  if (!collection) {
    notFound();
  }
  const supabase = await createSupabaseServerClient();
  const {data: authUser} = await supabase.auth.getUser();
  const wishlistedProductIds = await getWishlistedProductIds({
    userId: authUser.user?.id,
    productIds: products.map((product) => product.product_id),
    client: supabase as never
  });

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
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
            initiallyWishlisted={wishlistedProductIds.has(product.product_id)}
          />
        ))}
      </section>
    </main>
  );
}
