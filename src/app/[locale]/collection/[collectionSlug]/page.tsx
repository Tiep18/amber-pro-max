import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {getRequestMarket} from '@/catalog/page-context';
import {getCatalogCollectionBySlug, listCatalogProducts} from '@/catalog/queries';
import {ProductCard} from '@/components/catalog/product-card';
import type {Locale} from '@/i18n/routing';

export default async function CollectionPage({
  params
}: {
  params: Promise<{locale: Locale; collectionSlug: string}>;
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

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
      <header className="grid max-w-[760px] gap-3">
        <h1 className="text-[30px] font-semibold leading-tight">{collection.name}</h1>
        <p className="text-[var(--muted-foreground)]">{collection.description}</p>
      </header>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} locale={locale} />
        ))}
      </section>
    </main>
  );
}
