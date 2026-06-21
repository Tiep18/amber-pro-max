import {getTranslations} from 'next-intl/server';
import {formatMoney} from '@/catalog/money';
import type {CatalogProduct} from '@/catalog/queries';
import {WishlistHeart} from '@/components/catalog/wishlist-heart';
import type {Locale} from '@/i18n/routing';
import {getProductPath} from '@/i18n/routing';

function publicImageUrl(bucket: string | null, path: string | null) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !bucket || !path) {
    return null;
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function ProductCard({product, locale}: {product: CatalogProduct; locale: Locale}) {
  const t = await getTranslations('catalog');
  const imageUrl = publicImageUrl(product.primary_image_bucket, product.primary_image_path);
  const currencyCode = product.currency_code === 'VND' ? 'VND' : 'USD';
  const badge = product.product_type === 'pdf_pattern' ? t('pdfPattern') : t('finishedItem');
  const productPath = getProductPath(locale, product.slug);

  return (
    <article
      aria-label={product.title}
      className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="relative aspect-[4/3] bg-[var(--surface-muted)]">
        {imageUrl ? (
          // Public catalog images are admin-managed Supabase Storage objects.
          <img
            src={imageUrl}
            alt={product.primary_image_alt || product.title}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute right-3 top-3">
          <WishlistHeart
            productId={product.product_id}
            productTitle={product.title}
            locale={locale}
            returnTo={productPath}
            labels={{
              save: t('wishlist.save'),
              remove: t('wishlist.remove'),
              saving: t('wishlist.saving'),
              removing: t('wishlist.removing')
            }}
          />
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug">{product.title}</h2>
          <span className="shrink-0 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
            {badge}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{product.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              {formatMoney({amountMinor: product.price_minor, currencyCode})}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {product.in_stock ? t('inStock') : t('outOfStock')}
            </p>
          </div>
          <a
            href={productPath}
            className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {t('viewProduct')}
          </a>
        </div>
      </div>
    </article>
  );
}
