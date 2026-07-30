import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  Globe2,
  Languages,
  PackageCheck,
  Palette,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localizedMetadata } from '@/catalog/metadata';
import { type CatalogProduct, type CatalogProductType } from '@/catalog/queries';
import {
  CatalogCommerce,
  type CatalogCommerceLabels
} from '@/components/catalog/catalog-commerce';
import { ProductCardView } from '@/components/catalog/product-card-view';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/content/seo/json-ld';
import type { Locale } from '@/i18n/routing';
import { getCatalogPath } from '@/i18n/routing';
import { getHomeFeaturedProducts } from '@/storefront/home-featured-products';

export const revalidate = 300;
export const dynamic = 'force-static';

function catalogTypePath(locale: Locale, type: CatalogProductType) {
  return `${getCatalogPath(locale)}?type=${type}`;
}

function featuredCommerceLabels(
  locale: Locale,
  t: Awaited<ReturnType<typeof getTranslations<'catalog'>>>
): CatalogCommerceLabels {
  const copy =
    locale === 'vi'
      ? {
          technique: 'Kỹ thuật',
          allTechniques: 'Tất cả kỹ thuật',
          tag: 'Thẻ',
          allTags: 'Tất cả thẻ',
          resolving: 'Đang kiểm tra giá và tình trạng hàng…',
          loaded: 'Đã tải cửa hàng {market}. {count} sản phẩm.',
          errorTitle: 'Không thể cập nhật cửa hàng.',
          errorBody:
            'Giá và tình trạng hàng có thể đã cũ. Hãy thử lại trước khi mua.',
          retry: 'Thử lại',
          emptyTitle: 'Không có sản phẩm phù hợp với khu vực và bộ lọc này.',
          emptyBody:
            'Hãy đổi bộ lọc hoặc chọn khu vực mua sắm khác để xem thêm sản phẩm.',
          noFilters: 'không có bộ lọc',
          marketNames: { vn: 'Việt Nam', intl: 'quốc tế' },
          placeholderStatus: 'Đang cập nhật ảnh'
        }
      : {
          technique: 'Technique',
          allTechniques: 'All techniques',
          tag: 'Tag',
          allTags: 'All tags',
          resolving: 'Checking prices and availability…',
          loaded: '{market} store loaded. {count} products.',
          errorTitle: 'We could not update this store.',
          errorBody:
            'Prices and availability may be out of date. Try again before shopping.',
          retry: 'Try again',
          emptyTitle: 'No products match this market and filters.',
          emptyBody:
            'Change a filter or choose another shopping region to see more products.',
          noFilters: 'no filters',
          marketNames: { vn: 'Vietnam', intl: 'International' },
          placeholderStatus: 'Image coming soon'
        };

  return {
    card: {
      viewProduct: t('viewProduct'),
      pdfPattern: t('pdfPattern'),
      finishedItem: t('finishedItem'),
      inStock: t('inStock'),
      outOfStock: t('outOfStock'),
      placeholder: {
        brand: 'Ambertinybear',
        status: copy.placeholderStatus
      },
      wishlist: {
        save: String(t.raw('wishlist.save')),
        remove: String(t.raw('wishlist.remove')),
        saving: t('wishlist.saving'),
        removing: t('wishlist.removing'),
        signedOut: t('wishlist.signedOut'),
        invalid: t('wishlist.invalid'),
        failed: t('wishlist.failed')
      }
    },
    filters: {
      category: t('categoryLabel'),
      allCategories: t('allCategories'),
      technique: copy.technique,
      allTechniques: copy.allTechniques,
      tag: copy.tag,
      allTags: copy.allTags
    },
    resolving: copy.resolving,
    loaded: copy.loaded,
    showing: String(t.raw('showingCount')),
    loadMore: t('loadMore'),
    errorTitle: copy.errorTitle,
    errorBody: copy.errorBody,
    retry: copy.retry,
    emptyTitle: copy.emptyTitle,
    emptyBody: copy.emptyBody,
    noFilters: copy.noFilters,
    marketNames: copy.marketNames
  };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'vi'
      ? 'Ambertinybear | Mau moc amigurumi va san pham thu cong'
      : 'Ambertinybear | Amigurumi patterns and handmade crochet gifts';
  const description =
    locale === 'vi'
      ? 'Mua mau PDF crochet va san pham amigurumi thu cong tu Ambertinybear, ho tro tieng Viet va giao hang thi truong Viet Nam.'
      : 'Shop downloadable crochet PDF patterns and handmade amigurumi gifts from Ambertinybear for international customers.';

  return localizedMetadata({
    title,
    description,
    canonicalPath: `/${locale}`,
    alternatePaths: {
      vi: '/vi',
      en: '/en'
    }
  });
}

function ArrowLink({
  href,
  children,
  testId
}: {
  href: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-[var(--radius-control)] bg-[var(--brand)] px-5 py-3 text-sm font-semibold !text-[var(--surface-paper)] shadow-[0_18px_42px_rgb(98_34_12/18%)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-[0_24px_54px_rgb(98_34_12/22%)] active:translate-y-0 active:scale-[0.98] sm:text-base"
    >
      {children}
      <span className="grid size-7 place-items-center rounded-[var(--radius-control)] bg-white/12 transition duration-300 group-hover:translate-x-0.5">
        <ArrowRight aria-hidden="true" className="size-4" />
      </span>
    </Link>
  );
}

function FeaturedRow({
  products,
  locale,
  productType,
  labels,
  title,
  intro,
  href,
  linkLabel,
  testId,
  tone = 'light'
}: {
  products: CatalogProduct[];
  locale: Locale;
  productType: CatalogProductType;
  labels: CatalogCommerceLabels;
  title: string;
  intro: string;
  href: string;
  linkLabel: string;
  testId: string;
  tone?: 'light' | 'taupe';
}) {
  const productGridClassName =
    tone === 'taupe'
      ? 'rounded-[18px] bg-[#ded0c8] p-3 ring-1 ring-[#cbb9b0]'
      : '';

  return (
    <section id={testId} data-testid={testId} className="grid scroll-mt-8 gap-7">
      <div className="flex flex-col items-start justify-between gap-4 border-t border-[var(--foreground)]/10 pt-7 sm:flex-row sm:items-end">
        <div className="grid max-w-2xl gap-2">
          <h2 className="text-3xl font-semibold leading-[1.05] text-balance sm:text-4xl">{title}</h2>
          <p className="max-w-[62ch] text-pretty text-[var(--muted-foreground)]">{intro}</p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-1 font-semibold text-[var(--foreground)] transition duration-200 hover:translate-x-1 hover:text-[var(--accent-hover)] focus-visible:px-3"
        >
          {linkLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div
        className={`${productGridClassName} [&_[data-testid=catalog-product-grid]]:xl:grid-cols-4`}
      >
        <Suspense
          fallback={
            <div className="grid gap-y-6 min-[480px]:grid-cols-2 min-[480px]:gap-x-3 sm:gap-5 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCardView
                  key={product.product_id}
                  product={product}
                  locale={locale}
                  labels={labels.card}
                  commerceState="pending"
                />
              ))}
            </div>
          }
        >
          <CatalogCommerce
            locale={locale}
            surface="home"
            seoProducts={products}
            labels={labels}
            fixedFilters={{ productType }}
            limit={4}
          />
        </Suspense>
      </div>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, catalogT, handmadeProducts, patternProducts] = await Promise.all([
    getTranslations('home'),
    getTranslations('catalog'),
    getHomeFeaturedProducts({ locale, productType: 'physical_finished' }),
    getHomeFeaturedProducts({ locale, productType: 'pdf_pattern' })
  ]);
  const commerceLabels = featuredCommerceLabels(locale, catalogT);
  const handmadePath = catalogTypePath(locale, 'physical_finished');
  const patternPath = catalogTypePath(locale, 'pdf_pattern');
  const benefits = [
    { icon: Sparkles, title: t('benefits.originalTitle'), body: t('benefits.originalBody') },
    { icon: Palette, title: t('benefits.supportTitle'), body: t('benefits.supportBody') },
    { icon: Globe2, title: t('benefits.marketTitle'), body: t('benefits.marketBody') },
    { icon: ShieldCheck, title: t('benefits.secureTitle'), body: t('benefits.secureBody') }
  ];
  const trustItems = [
    { icon: UserCheck, label: t('trust.guest') },
    { icon: Globe2, label: t('trust.market') },
    { icon: Download, label: t('trust.downloads') },
    { icon: PackageCheck, label: t('trust.shipping') },
    { icon: Languages, label: t('trust.languages') }
  ];

  return (
    <main className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <section className="relative isolate min-h-[520px] overflow-hidden sm:min-h-[560px] lg:min-h-[620px]">
        {/* Full-bleed hero image */}
        <Image
          src="/images/home/hero-studio.png"
          alt={t('hero.imageAlt')}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Warm gradient overlay — left-heavy for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6f0e6]/95 via-[#f6f0e6]/70 to-transparent lg:via-[#f6f0e6]/45" />

        {/* Content */}
        <div className="container relative z-10 flex min-h-[inherit] items-center py-16 sm:py-20">
          <div className="grid max-w-lg gap-6 lg:max-w-xl">
            <div className="grid gap-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {t('hero.kicker')}
              </p>
              <h1 className="text-[2.75rem] font-bold leading-[0.93] text-[var(--brand)] sm:text-[3.5rem] lg:text-[4rem]">
                Ambertinybear
              </h1>
              <p className="max-w-[480px] text-lg font-medium leading-snug text-[var(--foreground)]/90 sm:text-xl lg:text-[1.375rem]">
                {t('hero.headline')}
              </p>
            </div>

            <p className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--muted-foreground)]">
              {t('hero.intro')}
            </p>

            <div className="flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <ArrowLink href="#shop-path-handmade" testId="hero-handmade-cta">
                {t('hero.handmadeCta')}
              </ArrowLink>
              <Link
                href="#shop-path-patterns"
                data-testid="hero-patterns-cta"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--foreground)]/12 bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--foreground)] backdrop-blur-sm transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--foreground)]/25 hover:bg-white hover:shadow-md active:translate-y-0 active:scale-[0.98] sm:text-base"
              >
                {t('hero.patternCta')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-paper)]">
        <div className="container py-16 sm:py-24">
          <section aria-labelledby="shop-paths-title" className="grid gap-10 sm:gap-14">
            <div className="mx-auto grid max-w-xl gap-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {locale === 'vi' ? 'Khám phá cửa hàng' : 'Explore the Shop'}
              </p>
              <h2
                id="shop-paths-title"
                className="text-2xl font-semibold leading-snug text-[var(--brand)] sm:text-3xl lg:text-[2.25rem]"
              >
                {t('paths.title')}
              </h2>
              <div className="mx-auto mt-1 h-px w-12 bg-[var(--brand)]/30" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-7">
              {/* Card 1 — Handmade */}
              <Link
                id="shop-path-handmade"
                href={handmadePath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-handmade"
                className="group relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/[0.04] transition-shadow duration-500 hover:shadow-lg"
              >
                <div className="aspect-[5/4] sm:aspect-[6/5]">
                  <Image
                    src="/images/home/handmade-category.png"
                    alt={t('paths.handmadeImageAlt')}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent px-6 pb-7 pt-20 sm:px-8 sm:pb-9">
                  <h3 className="text-2xl font-bold text-white sm:text-[1.75rem]">
                    {t('paths.handmadeTitle')}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/80 line-clamp-2">
                    {t('paths.handmadeBody')}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-[#e8b4a2] transition-colors duration-300 group-hover:text-white">
                    {t('hero.handmadeCta')}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>

              {/* Card 2 — Patterns */}
              <Link
                id="shop-path-patterns"
                href={patternPath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-patterns"
                className="group relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/[0.04] transition-shadow duration-500 hover:shadow-lg"
              >
                <div className="aspect-[5/4] sm:aspect-[6/5]">
                  <Image
                    src="/images/home/pattern-category.png"
                    alt={t('paths.patternImageAlt')}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent px-6 pb-7 pt-20 sm:px-8 sm:pb-9">
                  <h3 className="text-2xl font-bold text-white sm:text-[1.75rem]">
                    {t('paths.patternTitle')}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/80 line-clamp-2">
                    {t('paths.patternBody')}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-[#e8b4a2] transition-colors duration-300 group-hover:text-white">
                    {t('hero.patternCta')}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="bg-[var(--surface-paper)]">
        <div className="container py-16 sm:py-24">
          <FeaturedRow
            products={handmadeProducts}
            locale={locale}
            productType="physical_finished"
            labels={commerceLabels}
            title={t('featured.handmadeTitle')}
            intro={t('featured.handmadeBody')}
            href={handmadePath}
            linkLabel={t('featured.viewHandmade')}
            testId="featured-handmade"
          />
        </div>
      </section>

      <section className="bg-[#d4c4bc]">
        <div className="container py-16 sm:py-24">
          <FeaturedRow
            products={patternProducts}
            locale={locale}
            productType="pdf_pattern"
            labels={commerceLabels}
            title={t('featured.patternTitle')}
            intro={t('featured.patternBody')}
            href={patternPath}
            linkLabel={t('featured.viewPatterns')}
            testId="featured-patterns"
            tone="taupe"
          />
        </div>
      </section>

      <section className="bg-[var(--surface-blush)]">
        <div className="container grid gap-8 py-14 sm:py-18 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="grid gap-3">
            <h2 className="text-3xl font-semibold leading-tight text-balance sm:text-4xl">
              {t('trust.title')}
            </h2>
            <p className="max-w-[48ch] text-pretty text-[var(--muted-foreground)]">
              {t('trust.body')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-[12px] bg-white/72 p-4 ring-1 ring-[var(--border)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface-paper)]">
                  <Icon aria-hidden="true" className="size-5 text-[var(--trust-accent)]" strokeWidth={1.8} />
                </span>
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-paper)]">
        <div className="container grid gap-8 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[var(--surface-muted)] shadow-[0_22px_72px_rgb(98_34_12/12%)] ring-1 ring-[var(--border)]">
            <Image
              src="/images/home/maker-story.png"
              alt={t('story.imageAlt')}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="grid gap-7 rounded-[18px] bg-white p-6 shadow-[0_22px_72px_rgb(98_34_12/10%)] ring-1 ring-[var(--border)] sm:p-8 lg:-ml-16 lg:pl-20">
            <h2 className="text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">
              {t('story.title')}
            </h2>
            <p className="text-lg leading-relaxed text-pretty text-[var(--muted-foreground)]">
              {t('story.body')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map(({ icon: Icon, title, body }) => (
                <div key={title} className="grid gap-2 border-t border-[var(--foreground)]/10 pt-4">
                  <Icon aria-hidden="true" className="size-5 text-[var(--accent)]" strokeWidth={1.8} />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
                </div>
              ))}
            </div>
            <div className="justify-self-start">
              <ArrowLink href={getCatalogPath(locale)}>{t('story.cta')}</ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
