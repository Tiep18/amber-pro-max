import type { ReactNode } from 'react';
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
import { marketForLocale } from '@/catalog/seo-market';
import { type CatalogProduct, type CatalogProductType } from '@/catalog/queries';
import { getCachedCatalogProducts } from '@/catalog/public-cache';
import { ProductCard } from '@/components/catalog/product-card';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/content/seo/json-ld';
import type { Locale } from '@/i18n/routing';
import { getCatalogPath } from '@/i18n/routing';

export const revalidate = 300;
export const dynamic = 'force-static';

async function featuredProducts(locale: Locale, productType: CatalogProductType) {
  try {
    const market = marketForLocale(locale);
    const products = await getCachedCatalogProducts({
      locale,
      market,
      productType,
      sort: 'newest'
    });
    return products.slice(0, 4);
  } catch {
    return [];
  }
}

function catalogTypePath(locale: Locale, type: CatalogProductType) {
  return `${getCatalogPath(locale)}?type=${type}`;
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
  title,
  intro,
  href,
  linkLabel,
  testId,
  tone = 'light'
}: {
  products: CatalogProduct[];
  locale: Locale;
  title: string;
  intro: string;
  href: string;
  linkLabel: string;
  testId: string;
  tone?: 'light' | 'taupe';
}) {
  if (!products.length) return null;
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
        className={
          tone === 'taupe'
            ? 'grid gap-5 rounded-[18px] bg-[#ded0c8] p-3 ring-1 ring-[#cbb9b0] sm:grid-cols-2 xl:grid-cols-4'
            : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-4'
        }
      >
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, handmadeProducts, patternProducts] = await Promise.all([
    getTranslations('home'),
    featuredProducts(locale, 'physical_finished'),
    featuredProducts(locale, 'pdf_pattern')
  ]);
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
      <section className="relative isolate overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,#f7ead7,rgba(246,242,234,0))]" />
        <div className="container relative grid min-h-[620px] items-center gap-10 pb-14 pt-20 sm:pt-24 lg:min-h-[540px] lg:grid-cols-[0.86fr_1.14fr] lg:gap-10 lg:pb-12 lg:pt-14">
          <div className="relative z-10 grid max-w-2xl gap-5 text-pretty">
            <p className="text-sm font-semibold text-[var(--accent)]">{t('hero.kicker')}</p>
            <h1 className="max-w-full break-words text-[42px] font-bold leading-[0.96] text-balance text-[var(--brand)] sm:text-[60px] lg:text-[76px]">
              Ambertinybear
            </h1>
            <p className="max-w-[620px] text-3xl font-semibold leading-[1.05] tracking-[-0.01em] text-balance sm:text-4xl lg:text-[46px]">
              {t('hero.headline')}
            </p>
            <p className="max-w-[58ch] text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              {t('hero.intro')}
            </p>
            <div className="flex flex-col items-stretch gap-3 pt-2 min-[420px]:flex-row min-[420px]:items-center">
              <ArrowLink href="#shop-path-handmade" testId="hero-handmade-cta">
                {t('hero.handmadeCta')}
              </ArrowLink>
              <Link
                href="#shop-path-patterns"
                data-testid="hero-patterns-cta"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--foreground)]/18 bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--foreground)] shadow-[0_16px_36px_rgb(38_35_31/8%)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--foreground)]/35 hover:bg-white active:translate-y-0 active:scale-[0.98] sm:text-base"
              >
                {t('hero.patternCta')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[430px] lg:min-h-[500px]">
            <div className="absolute inset-0 translate-x-5 rounded-[28px] bg-[#e8ded7]" />
            <div className="relative ml-auto grid max-w-[760px] gap-4 rounded-[28px] bg-white/36 p-2 shadow-[0_30px_90px_rgb(98_34_12/10%)] ring-1 ring-white/60 sm:p-3 lg:grid-cols-[1.14fr_0.86fr] lg:grid-rows-2 lg:items-stretch">
              <div className="relative aspect-[5/4] overflow-hidden rounded-[24px] bg-[var(--surface-muted)] shadow-[0_22px_60px_rgb(98_34_12/12%)] ring-1 ring-white/80 lg:row-span-2 lg:h-full lg:min-h-[430px] lg:aspect-auto">
                <Image
                  src="/images/home/handmade-category.png"
                  alt={t('paths.handmadeImageAlt')}
                  fill
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover object-right saturate-[0.98]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[0.92fr_1.08fr] lg:contents">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-white shadow-[0_18px_44px_rgb(98_34_12/10%)] ring-1 ring-white/80 lg:aspect-auto lg:h-full">
                  <Image
                    src="/images/home/hero-studio.png"
                    alt={t('hero.imageAlt')}
                    fill
                    sizes="(min-width: 1024px) 24vw, 50vw"
                    className="object-cover object-right-top"
                  />
                </div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-white shadow-[0_18px_44px_rgb(98_34_12/10%)] ring-1 ring-white/80 sm:-mt-10 lg:mt-0 lg:aspect-auto lg:h-full">
                  <Image
                    src="/images/home/pattern-category.png"
                    alt={t('paths.patternImageAlt')}
                    fill
                    sizes="(min-width: 1024px) 26vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-paper)]">
        <div className="container py-16 sm:py-24">
          <section aria-labelledby="shop-paths-title" className="grid gap-9">
            <div className="grid max-w-3xl gap-3">
              <h2
                id="shop-paths-title"
                className="text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl"
              >
                {t('paths.title')}
              </h2>
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-[1.22fr_0.78fr]">
              <Link
                id="shop-path-handmade"
                href={handmadePath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-handmade"
                className="group grid scroll-mt-8 overflow-hidden rounded-[18px] bg-white shadow-[0_20px_70px_rgb(98_34_12/10%)] ring-1 ring-[var(--border)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_30px_90px_rgb(98_34_12/14%)]"
              >
                <div className="grid gap-0 md:grid-cols-[1.04fr_0.96fr]">
                  <div className="relative min-h-[320px] overflow-hidden bg-[var(--surface-muted)]">
                    <Image
                      src="/images/home/handmade-category.png"
                      alt={t('paths.handmadeImageAlt')}
                      fill
                      sizes="(min-width: 1024px) 48vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="grid content-between gap-8 p-6 sm:p-8">
                    <div className="grid gap-4">
                      <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        {t('paths.handmadeTitle')}
                      </h3>
                      <p className="text-pretty text-[var(--muted-foreground)]">
                        {t('paths.handmadeBody')}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)]">
                      {t('hero.handmadeCta')}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </div>
              </Link>
              <Link
                id="shop-path-patterns"
                href={patternPath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-patterns"
                className="group grid scroll-mt-8 gap-4 rounded-[18px] bg-[#ded0c8] p-4 shadow-[0_18px_55px_rgb(98_34_12/10%)] ring-1 ring-[#cbb9b0] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_28px_78px_rgb(98_34_12/14%)] lg:mt-16"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[var(--surface-muted)]">
                  <Image
                    src="/images/home/pattern-category.png"
                    alt={t('paths.patternImageAlt')}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="grid gap-3 px-1 pb-2">
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="text-2xl font-semibold leading-tight sm:text-3xl">
                      {t('paths.patternTitle')}
                    </h3>
                    <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-white/82 text-[var(--foreground)] transition duration-300 group-hover:translate-x-1">
                      <ArrowRight aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <p className="text-pretty text-[var(--muted-foreground)]">
                    {t('paths.patternBody')}
                  </p>
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
