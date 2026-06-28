import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  CreditCard,
  Download,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Star,
  Truck
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Json } from '@/types/supabase';
import type { CurrencyCode } from '@/catalog/money';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { marketForLocale } from '@/catalog/seo-market';
import {
  JsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd
} from '@/content/seo/json-ld';
import { getCachedCatalogProduct, getCachedCatalogProducts } from '@/catalog/public-cache';
import { getProductMediaImages } from '@/catalog/product-media';
import { ProductGallery } from '@/components/catalog/product-gallery';
import { UnavailableMarket } from '@/components/catalog/unavailable-market';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { WishlistHeart } from '@/components/catalog/wishlist-heart';
import type { PublicVariant } from '@/components/catalog/variant-selector';
import { ProductDetailTabs } from '@/components/catalog/product-detail-tabs';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { getApprovedProductReviews } from '@/reviews/queries';
import { getCatalogPath, getProductPath, type Locale } from '@/i18n/routing';

type Params = Promise<{ locale: Locale; productSlug: string }>;

export const revalidate = 300;
export const dynamic = 'force-static';

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
  return { vi: slugs.vi, en: slugs.en };
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
    return [
      {
        variant_id: row.variant_id,
        sku: row.sku,
        display_order: row.display_order,
        enabled: row.enabled,
        stock: row.stock,
        currency_code:
          row.currency_code === 'VND' || row.currency_code === 'USD' ? row.currency_code : null,
        price_minor: typeof row.price_minor === 'number' ? row.price_minor : null,
        attributes: stringRecord(row.attributes ?? {})
      }
    ];
  });
}

function reviewAverage(reviews: Array<{ rating: number }>) {
  if (!reviews.length) {
    return null;
  }
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function ReviewInlineSummary({
  average,
  count,
  locale
}: {
  average: number | null;
  count: number;
  locale: Locale;
}) {
  if (!average || count === 0) {
    return null;
  }
  return (
    <a
      href="#reviews"
      className="flex w-fit flex-wrap items-center gap-2 text-sm font-semibold text-[var(--foreground)]"
    >
      <span className="flex text-[var(--warning)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${index < Math.round(average) ? 'fill-current' : ''}`}
          />
        ))}
      </span>
      <span>{average.toFixed(1)}</span>
      <span className="text-[var(--muted-foreground)]">
        ({count} {locale === 'vi' ? 'danh gia' : 'reviews'})
      </span>
    </a>
  );
}

function PurchaseInfo({
  productType,
  locale
}: {
  productType: 'pdf_pattern' | 'physical_finished';
  locale: Locale;
}) {
  const isPdf = productType === 'pdf_pattern';
  const items = isPdf
    ? locale === 'vi'
      ? [
          {
            icon: Download,
            title: 'Tai ve sau thanh toan',
            body: 'Lien ket tai PDF duoc kich hoat khi don hang da thanh toan.'
          },
          {
            icon: ShieldCheck,
            title: 'Link rieng co thoi han',
            body: 'File pattern duoc giao qua lien ket bao ve, khong phai URL cong khai.'
          }
        ]
      : [
          {
            icon: Download,
            title: 'Download after payment',
            body: 'Your PDF link opens after the order is confirmed paid.'
          },
          {
            icon: ShieldCheck,
            title: 'Protected expiring link',
            body: 'Pattern files are delivered through private, time-limited access.'
          }
        ]
    : locale === 'vi'
      ? [
          {
            icon: PackageCheck,
            title: 'Dong goi 1-2 ngay lam viec',
            body: 'Shop chuan bi va xac nhan phi ship truoc khi giao.'
          },
          {
            icon: Truck,
            title: 'Giao hang thu cong',
            body: 'Theo doi trang thai va ma van don trong don hang sau khi gui.'
          }
        ]
      : [
          {
            icon: PackageCheck,
            title: 'Packed in 1-2 business days',
            body: 'The shop prepares your handmade item and confirms shipping.'
          },
          {
            icon: Truck,
            title: 'Manual carrier handling',
            body: 'Tracking and status are updated after dispatch.'
          }
        ];

  return (
    <div className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="flex gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{item.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrustBadges({
  productType,
  locale
}: {
  productType: 'pdf_pattern' | 'physical_finished';
  locale: Locale;
}) {
  const isPdf = productType === 'pdf_pattern';
  const badges = isPdf
    ? locale === 'vi'
      ? [
          { icon: CreditCard, label: 'Thanh toan an toan' },
          { icon: Download, label: 'PDF chat luong cao' },
          { icon: BadgeCheck, label: 'Tai lai khi can' },
          { icon: MessageCircle, label: 'Ho tro sau mua' }
        ]
      : [
          { icon: CreditCard, label: 'Secure payment' },
          { icon: Download, label: 'High-quality PDF' },
          { icon: BadgeCheck, label: 'Download support' },
          { icon: MessageCircle, label: 'Post-purchase help' }
        ]
    : locale === 'vi'
      ? [
          { icon: CreditCard, label: 'Thanh toan an toan' },
          { icon: RefreshCcw, label: 'Ho tro doi tra' },
          { icon: BadgeCheck, label: 'Lam thu cong' },
          { icon: MessageCircle, label: 'Ho tro qua chat' }
        ]
      : [
          { icon: CreditCard, label: 'Secure payment' },
          { icon: RefreshCcw, label: 'Return support' },
          { icon: BadgeCheck, label: 'Handmade item' },
          { icon: MessageCircle, label: 'Chat support' }
        ];

  return (
    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.label}
            className="flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--trust-surface)] px-3 py-2 text-[var(--trust-accent)]"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, productSlug } = await params;
  const market = marketForLocale(locale);
  const product = await getCachedCatalogProduct(locale, market, productSlug);
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

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const products = await getCachedCatalogProducts({
        locale,
        market: marketForLocale(locale)
      });
      return products.map((product) => ({ locale, productSlug: product.slug }));
    })
  );
  return entries.flat();
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, productSlug } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale);
  const [product, t, marketT, catalogT] = await Promise.all([
    getCachedCatalogProduct(locale, market, productSlug),
    getTranslations('product'),
    getTranslations('market'),
    getTranslations('catalog')
  ]);
  if (!product) {
    notFound();
  }
  const imageUrl =
    publicStorageUrl(product.primary_image_bucket, product.primary_image_path) ?? null;
  const specs = stringRecord(product.specifications);
  const variants = publicVariants(product.variants);
  const productType =
    product.product_type === 'physical_finished' ? 'physical_finished' : 'pdf_pattern';
  const typeLabel = productType === 'pdf_pattern' ? t('pdfPattern') : t('finishedItem');
  const otherMarket =
    product.other_market_code === 'vn' || product.other_market_code === 'intl'
      ? product.other_market_code
      : null;
  const productPath = getProductPath(locale, product.slug);
  const [reviews, mediaImages] = await Promise.all([
    getApprovedProductReviews({ productId: product.product_id }),
    getProductMediaImages({
      productId: product.product_id,
      primaryImagePath: product.primary_image_path,
      primaryImageBucket: product.primary_image_bucket,
      primaryImageAlt: product.primary_image_alt,
      title: product.title,
      locale
    })
  ]);
  const reviewList = reviews.status === 'success' ? reviews.reviews : [];
  const averageRating = reviewAverage(reviewList);
  const currencyCode: CurrencyCode | null =
    product.currency_code === 'VND' || product.currency_code === 'USD'
      ? product.currency_code
      : null;

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          productJsonLd({
            name: product.title,
            description: product.description,
            path: productPath,
            image: imageUrl,
            currency:
              product.currency_code === 'VND' || product.currency_code === 'USD'
                ? product.currency_code
                : null,
            priceMinor: product.price_minor,
            available: product.available && product.in_stock,
            aggregateRating:
              averageRating && reviewList.length > 0
                ? { ratingValue: averageRating, reviewCount: reviewList.length }
                : null
          }),
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: product.title, path: productPath }
          ])
        ]}
      />
      <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)] lg:px-10 xl:px-12">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ProductGallery images={mediaImages} alt={product.primary_image_alt || product.title} />
        </div>
        <section className="grid content-start gap-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted-foreground)]">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link className="hover:text-[var(--foreground)]" href={`/${locale}`}>
                  {locale === 'vi' ? 'Trang chu' : 'Home'}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link className="hover:text-[var(--foreground)]" href={getCatalogPath(locale)}>
                  {locale === 'vi' ? 'Cua hang' : 'Shop'}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-semibold text-[var(--foreground)]">{product.title}</li>
            </ol>
          </nav>
          <div className="flex items-center justify-between gap-3">
            <span className="w-fit rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
              {typeLabel}
            </span>
            <WishlistHeart
              productId={product.product_id}
              productTitle={product.title}
              locale={locale}
              returnTo={productPath}
              labels={{
                save: t('wishlist.save', { title: product.title }),
                remove: t('wishlist.remove', { title: product.title }),
                saving: t('wishlist.saving'),
                removing: t('wishlist.removing')
              }}
            />
          </div>
          <div className="grid gap-3">
            <h1 className="text-[34px] font-semibold leading-tight">{product.title}</h1>
            <ReviewInlineSummary
              average={averageRating}
              count={reviewList.length}
              locale={locale}
            />
            <p className="text-[var(--muted-foreground)]">{product.description}</p>
          </div>
          <PurchaseInfo productType={productType} locale={locale} />
          {!product.available ? (
            <UnavailableMarket
              title={t('unavailableTitle')}
              body={t('unavailableBody')}
              otherMarket={otherMarket}
              returnTo={productPath}
              switchLabel={
                otherMarket === 'vn' ? marketT('switchToVietnam') : marketT('switchToInternational')
              }
            />
          ) : null}
          {product.available ? (
            <AddToCart
              locale={locale}
              market={market}
              title={product.title}
              productId={product.product_id}
              productType={productType}
              available={product.available}
              inStock={product.in_stock}
              variants={variants}
              priceMinor={product.price_minor}
              currencyCode={currencyCode}
            />
          ) : null}
          <TrustBadges productType={productType} locale={locale} />
        </section>
      </main>
      <section className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 pb-14 sm:px-6 lg:px-10 xl:px-12">
        <ProductDetailTabs
          locale={locale}
          productType={productType}
          description={product.description}
          specs={specs}
        />
        <div id="reviews" className="scroll-mt-8">
          {reviews.status === 'success' ? (
            <ProductReviews
              reviews={reviews.reviews}
              locale={locale}
              labels={{
                title: catalogT('reviews.title'),
                empty: catalogT('reviews.empty'),
                verifiedPurchase: catalogT('reviews.verifiedPurchase'),
                ratingLabel: catalogT('reviews.ratingLabel'),
                shopReply: catalogT('reviews.shopReply')
              }}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
