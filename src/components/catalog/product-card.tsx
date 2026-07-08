import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatMoney } from '@/catalog/money';
import type { CatalogProduct } from '@/catalog/queries';
import { ProductCardImage } from '@/components/catalog/product-card-image';
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
  eagerImage = false,
  initiallyWishlisted = false
}: {
  product: CatalogProduct;
  locale: Locale;
  eagerImage?: boolean;
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
      className="group relative grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-[18px] bg-[var(--surface)] shadow-[0_18px_55px_rgb(73_52_32/8%)] ring-1 ring-[var(--border)]/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgb(73_52_32/14%)]"
    >
      <Link
        href={productPath}
        transitionTypes={['nav-forward']}
        aria-label={`${t('viewProduct')}: ${product.title}`}
        className="absolute inset-0 z-10 rounded-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      />
      <div className="relative aspect-[5/4] overflow-hidden bg-[var(--surface-muted)]">
        <ProductCardImage
          src={imageUrl}
          alt={product.primary_image_alt || product.title}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          eager={eagerImage}
          fallbackBrand={placeholderLabels[locale].brand}
          fallbackStatus={placeholderLabels[locale].status}
        />
        <div className="absolute right-3 top-3 z-20">
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
              removing: t('wishlist.removing'),
              signedOut: t('wishlist.signedOut'),
              invalid: t('wishlist.invalid'),
              failed: t('wishlist.failed')
            }}
          />
        </div>
      </div>
      <div className="grid h-full grid-rows-[1fr_auto] gap-2.5 p-3 sm:gap-4 sm:p-5">
        <div className="grid content-start gap-1.5 sm:gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <span className="min-w-0 rounded-[var(--radius-control)] bg-[var(--surface-blush)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)] sm:px-2 sm:py-1 sm:text-[11px]">
              {badge}
            </span>
            <span className="shrink-0 pt-0.5 text-[10px] text-[var(--muted-foreground)] sm:pt-1 sm:text-xs">
              {product.in_stock ? t('inStock') : t('outOfStock')}
            </span>
          </div>
          <h2 className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] sm:text-lg sm:tracking-[-0.01em]">
            {product.title}
          </h2>
          <p className="line-clamp-1 break-words text-xs leading-snug text-[var(--muted-foreground)] sm:line-clamp-2 sm:text-sm sm:leading-relaxed">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)]/70 pt-2.5 sm:gap-4 sm:pt-4">
          <div className="grid gap-0.5">
            <p className="text-base font-semibold tabular-nums text-[var(--brand)] sm:text-lg">
              {formatMoney({ amountMinor: product.price_minor, currencyCode })}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex min-w-10 justify-end text-[var(--accent)] transition duration-200 group-hover:translate-x-1 group-hover:text-[var(--accent-hover)]"
          >
            <ArrowRight className="size-4 sm:size-5" strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </article>
  );
}
