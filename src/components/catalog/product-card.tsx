import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/catalog/money';
import type { CatalogProduct } from '@/catalog/queries';
import { WishlistHeart } from '@/components/catalog/wishlist-heart';
import type { Locale } from '@/i18n/routing';
import { getProductPath } from '@/i18n/routing';

const placeholderLabels = {
  vi: { brand: 'Ambertinybear', status: 'Dang cap nhat anh' },
  en: { brand: 'Ambertinybear', status: 'Image coming soon' }
} as const;

function publicImageUrl(bucket: string | null, path: string | null) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !bucket || !path) {
    return null;
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function ProductCard({
  product,
  locale,
  initiallyWishlisted = false
}: {
  product: CatalogProduct;
  locale: Locale;
  initiallyWishlisted?: boolean;
}) {
  const t = await getTranslations('catalog');
  const imageUrl = publicImageUrl(product.primary_image_bucket, product.primary_image_path);
  const currencyCode = product.currency_code === 'VND' ? 'VND' : 'USD';
  const badge = product.product_type === 'pdf_pattern' ? t('pdfPattern') : t('finishedItem');
  const productPath = getProductPath(locale, product.slug);

  return (
    <article
      aria-label={product.title}
      className="grid h-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.primary_image_alt || product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--surface-muted),#f7f4ef)] px-4 text-center text-sm text-[var(--muted-foreground)]">
            <span className="grid gap-1">
              <span className="font-semibold text-[var(--foreground)]">{placeholderLabels[locale].brand}</span>
              <span>{placeholderLabels[locale].status}</span>
            </span>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <WishlistHeart
            productId={product.product_id}
            productTitle={product.title}
            locale={locale}
            returnTo={productPath}
            initiallySaved={initiallyWishlisted}
            labels={{
              save: t('wishlist.save', { title: product.title }),
              remove: t('wishlist.remove', { title: product.title }),
              saving: t('wishlist.saving'),
              removing: t('wishlist.removing')
            }}
          />
        </div>
      </div>
      <div className="grid min-h-[220px] grid-rows-[auto_auto_1fr] gap-3 p-3 sm:min-h-[250px] sm:p-4">
        <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <h2 className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug sm:text-lg">{product.title}</h2>
          <span className="shrink-0 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
            {badge}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">
          {product.description}
        </p>
        <div className="mt-auto grid items-start gap-3 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              {formatMoney({ amountMinor: product.price_minor, currencyCode })}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {product.in_stock ? t('inStock') : t('outOfStock')}
            </p>
          </div>
          <Link
            href={productPath}
            transitionTypes={['nav-forward']}
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {t('viewProduct')}
          </Link>
        </div>
      </div>
    </article>
  );
}
