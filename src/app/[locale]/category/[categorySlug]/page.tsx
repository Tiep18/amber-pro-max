import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {getRequestMarket} from '@/catalog/page-context';
import {getCatalogCategoryBySlug, listCatalogProducts} from '@/catalog/queries';
import {ProductCard} from '@/components/catalog/product-card';
import type {Locale} from '@/i18n/routing';

export default async function CategoryPage({
  params
}: {
  params: Promise<{locale: Locale; categorySlug: string}>;
}) {
  const {locale, categorySlug} = await params;
  setRequestLocale(locale);
  const market = await getRequestMarket();
  const [category, products] = await Promise.all([
    getCatalogCategoryBySlug({locale, market, slug: categorySlug}),
    listCatalogProducts({locale, market, categorySlug})
  ]);
  if (!category) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
      <header className="grid max-w-[760px] gap-3">
        <h1 className="text-[30px] font-semibold leading-tight">{category.name}</h1>
        <p className="text-[var(--muted-foreground)]">{category.description}</p>
      </header>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} locale={locale} />
        ))}
      </section>
    </main>
  );
}
