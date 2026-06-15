import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {Json} from '@/types/supabase';
import {formatMoney} from '@/catalog/money';
import {localizedMetadata, publicStorageUrl} from '@/catalog/metadata';
import {getRequestMarket} from '@/catalog/page-context';
import {getCatalogProductBySlug} from '@/catalog/queries';
import {ProductGallery} from '@/components/catalog/product-gallery';
import {UnavailableMarket} from '@/components/catalog/unavailable-market';
import {AddToCart} from '@/components/catalog/add-to-cart';
import {VariantSelector, type PublicVariant} from '@/components/catalog/variant-selector';
import {
  getProductPath,
  type Locale
} from '@/i18n/routing';

type Params = Promise<{locale: Locale; productSlug: string}>;

function stringRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

function localizedSlugs(value: Json) {
  const slugs = stringRecord(value);
  return {vi: slugs.vi, en: slugs.en};
}

function publicVariants(value: Json): PublicVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return [];
    }
    const row = item as Record<string, Json | undefined>;
    if (
      typeof row.variant_id !== 'string' ||
      typeof row.sku !== 'string' ||
      typeof row.display_order !== 'number' ||
      typeof row.enabled !== 'boolean' ||
      typeof row.stock !== 'boolean'
    ) {
      return [];
    }
    return [{
      variant_id: row.variant_id,
      sku: row.sku,
      display_order: row.display_order,
      enabled: row.enabled,
      stock: row.stock,
      currency_code: row.currency_code === 'VND' || row.currency_code === 'USD' ? row.currency_code : null,
      price_minor: typeof row.price_minor === 'number' ? row.price_minor : null,
      attributes: stringRecord(row.attributes ?? {})
    }];
  });
}

export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, productSlug} = await params;
  const market = await getRequestMarket();
  const product = await getCatalogProductBySlug({locale, market, slug: productSlug});
  if (!product) {
    return {};
  }
  const slugs = localizedSlugs(product.localized_slugs);
  if (!slugs.vi || !slugs.en) {
    return {};
  }
  return localizedMetadata({
    title: product.seo_title || product.title,
    description: product.seo_description || product.description,
    canonicalPath: getProductPath(locale, product.slug),
    alternatePaths: {
      vi: getProductPath('vi', slugs.vi),
      en: getProductPath('en', slugs.en)
    },
    socialImage: publicStorageUrl(product.social_image_bucket, product.social_image_path)
  });
}

export default async function ProductPage({params}: {params: Params}) {
  const {locale, productSlug} = await params;
  setRequestLocale(locale);
  const market = await getRequestMarket();
  const [product, t, marketT] = await Promise.all([
    getCatalogProductBySlug({locale, market, slug: productSlug}),
    getTranslations('product'),
    getTranslations('market')
  ]);
  if (!product) {
    notFound();
  }
  const imageUrl = publicStorageUrl(product.primary_image_bucket, product.primary_image_path) ?? null;
  const specs = stringRecord(product.specifications);
  const variants = publicVariants(product.variants);
  const typeLabel = product.product_type === 'pdf_pattern' ? t('pdfPattern') : t('finishedItem');
  const otherMarket = product.other_market_code === 'vn' || product.other_market_code === 'intl'
    ? product.other_market_code
    : null;

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)] lg:px-10 xl:px-12">
      <ProductGallery imageUrl={imageUrl} alt={product.primary_image_alt || product.title} />
      <section className="grid content-start gap-5">
        <span className="w-fit rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
          {typeLabel}
        </span>
        <div className="grid gap-3">
          <h1 className="text-[32px] font-semibold leading-tight">{product.title}</h1>
          <p className="text-[var(--muted-foreground)]">{product.description}</p>
        </div>
        {product.product_type === 'pdf_pattern' ? (
          <div className="grid gap-3">
            <p className="font-semibold text-[var(--warning)]">{t('digitalWarning')}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {specs.difficulty ? <><dt>{t('difficulty')}</dt><dd>{specs.difficulty}</dd></> : null}
              {specs.file ? <><dt>{t('file')}</dt><dd>{specs.file}</dd></> : null}
              {specs.languages ? <><dt>{t('languages')}</dt><dd>{specs.languages}</dd></> : null}
            </dl>
          </div>
        ) : (
          <p className="font-semibold">{t('shippingNote')}</p>
        )}
        {!product.available ? (
          <UnavailableMarket
            title={t('unavailableTitle')}
            body={t('unavailableBody')}
            otherMarket={otherMarket}
            returnTo={getProductPath(locale, product.slug)}
            switchLabel={otherMarket === 'vn' ? marketT('switchToVietnam') : marketT('switchToInternational')}
          />
        ) : product.currency_code && product.price_minor !== null ? (
          <p className="text-2xl font-semibold">
            {formatMoney({
              amountMinor: product.price_minor,
              currencyCode: product.currency_code === 'VND' ? 'VND' : 'USD'
            })}
          </p>
        ) : null}
        {product.available ? (
          <AddToCart
            locale={locale}
            market={market}
            productId={product.product_id}
            productType={product.product_type === 'physical_finished' ? 'physical_finished' : 'pdf_pattern'}
            available={product.available}
            variants={variants}
          />
        ) : null}
      </section>
    </main>
  );
}
