import {getTranslations, setRequestLocale} from 'next-intl/server';
import {CatalogControls} from '@/components/catalog/catalog-controls';
import {ProductCard} from '@/components/catalog/product-card';
import {getRequestMarket} from '@/catalog/page-context';
import {
  catalogSorts,
  listCatalogProducts,
  type CatalogProductType,
  type CatalogSort
} from '@/catalog/queries';
import type {Locale} from '@/i18n/routing';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const [{locale}, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [market, t] = await Promise.all([getRequestMarket(), getTranslations('catalog')]);
  const requestedSort = first(query.sort);
  const sort: CatalogSort = catalogSorts.includes(requestedSort as CatalogSort)
    ? (requestedSort as CatalogSort)
    : 'newest';
  const requestedType = first(query.type);
  const productType: CatalogProductType | undefined =
    requestedType === 'pdf_pattern' || requestedType === 'physical_finished'
      ? requestedType
      : undefined;
  const search = first(query.search);
  const products = await listCatalogProducts({
    locale,
    market,
    search,
    productType,
    categorySlug: first(query.category),
    techniqueId: first(query.technique),
    tagId: first(query.tag),
    collectionSlug: first(query.collection),
    sort
  });

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-7 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
      <header className="grid max-w-[760px] gap-3">
        <h1 className="text-[30px] font-semibold leading-tight">{t('title')}</h1>
        <p className="text-[var(--muted-foreground)]">{t('intro')}</p>
      </header>
      <CatalogControls search={search} productType={productType} sort={sort} />
      {products.length ? (
        <section aria-label={t('title')} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} locale={locale} />
          ))}
        </section>
      ) : (
        <section className="grid min-h-52 place-content-center gap-2 text-center">
          <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-[var(--muted-foreground)]">{t('emptyBody')}</p>
        </section>
      )}
    </main>
  );
}
