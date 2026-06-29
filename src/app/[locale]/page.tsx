import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, Languages, ShieldCheck } from 'lucide-react';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
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
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:text-base"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
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
  testId
}: {
  products: CatalogProduct[];
  locale: Locale;
  title: string;
  intro: string;
  href: string;
  linkLabel: string;
  testId: string;
}) {
  if (!products.length) return null;
  return (
    <section id={testId} data-testid={testId} className="grid scroll-mt-6 gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="grid max-w-2xl gap-2">
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h2>
          <p className="text-[var(--muted-foreground)]">{intro}</p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--accent)] hover:underline"
        >
          {linkLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
    { icon: HeartHandshake, title: t('benefits.handmadeTitle'), body: t('benefits.handmadeBody') },
    { icon: Languages, title: t('benefits.bilingualTitle'), body: t('benefits.bilingualBody') },
    { icon: ShieldCheck, title: t('benefits.secureTitle'), body: t('benefits.secureBody') }
  ];

  return (
    <main>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <section className="relative mx-auto min-h-[620px] max-w-[1440px] overflow-hidden bg-white sm:min-h-[680px] lg:min-h-[720px]">
        <Image
          src="/images/home/hero-studio.png"
          alt={t('hero.imageAlt')}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_44%,rgba(255,255,255,0.35)_72%,rgba(255,255,255,0)_100%)] sm:bg-[linear-gradient(90deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.78)_38%,rgba(255,255,255,0.2)_68%,rgba(255,255,255,0)_100%)] lg:bg-[linear-gradient(90deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.62)_38%,rgba(255,255,255,0)_66%)]" />
        <div className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-[1200px] items-start px-4 pt-16 sm:min-h-[680px] sm:px-6 sm:pt-24 lg:min-h-[720px] lg:items-center lg:px-10 lg:pt-0 xl:px-12">
          <div className="grid max-w-[570px] gap-6 text-pretty">
            <h1 className="text-[42px] font-semibold leading-[1.02] sm:text-[58px] lg:text-[68px]">
              Ambertinybear
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed sm:text-xl">{t('hero.intro')}</p>
            <div className="flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <ArrowLink href="#shop-path-handmade" testId="hero-handmade-cta">
                {t('hero.handmadeCta')}
              </ArrowLink>
              <Link
                href="#shop-path-patterns"
                data-testid="hero-patterns-cta"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--foreground)] bg-white/90 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white sm:text-base"
              >
                {t('hero.patternCta')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1200px] gap-20 px-4 py-16 sm:px-6 sm:py-20 lg:gap-28 lg:px-10 xl:px-12">
        <section aria-labelledby="shop-paths-title" className="grid gap-8">
          <div className="grid max-w-2xl gap-3">
            <p className="text-sm font-semibold uppercase text-[var(--accent)]">
              {t('paths.eyebrow')}
            </p>
            <h2 id="shop-paths-title" className="text-3xl font-semibold leading-tight sm:text-4xl">
              {t('paths.title')}
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Link
              id="shop-path-handmade"
              href={handmadePath}
              transitionTypes={['nav-forward']}
              data-testid="shop-path-handmade"
              className="group grid scroll-mt-6 gap-4"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)]">
                <Image
                  src="/images/home/handmade-category.png"
                  alt={t('paths.handmadeImageAlt')}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-2xl font-semibold">{t('paths.handmadeTitle')}</h3>
                  <ArrowRight aria-hidden="true" className="size-5 text-[var(--accent)]" />
                </div>
                <p className="text-[var(--muted-foreground)]">{t('paths.handmadeBody')}</p>
              </div>
            </Link>
            <Link
              id="shop-path-patterns"
              href={patternPath}
              transitionTypes={['nav-forward']}
              data-testid="shop-path-patterns"
              className="group grid scroll-mt-6 gap-4"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)]">
                <Image
                  src="/images/home/pattern-category.png"
                  alt={t('paths.patternImageAlt')}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-2xl font-semibold">{t('paths.patternTitle')}</h3>
                  <ArrowRight aria-hidden="true" className="size-5 text-[var(--accent)]" />
                </div>
                <p className="text-[var(--muted-foreground)]">{t('paths.patternBody')}</p>
              </div>
            </Link>
          </div>
        </section>

        <FeaturedRow
          products={handmadeProducts}
          locale={locale}
          title={t('featured.handmadeTitle')}
          intro={t('featured.handmadeBody')}
          href={handmadePath}
          linkLabel={t('featured.viewHandmade')}
          testId="featured-handmade"
        />
        <FeaturedRow
          products={patternProducts}
          locale={locale}
          title={t('featured.patternTitle')}
          intro={t('featured.patternBody')}
          href={patternPath}
          linkLabel={t('featured.viewPatterns')}
          testId="featured-patterns"
        />
      </div>

      <section className="border-y border-[var(--border)] bg-[var(--trust-surface)]">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-10 xl:px-12">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div key={title} className="grid content-start gap-3">
              <Icon
                aria-hidden="true"
                className="size-7 text-[var(--trust-accent)]"
                strokeWidth={1.75}
              />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-10 xl:px-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)]">
          <Image
            src="/images/home/maker-story.png"
            alt={t('story.imageAlt')}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="grid gap-5">
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">
            {t('story.eyebrow')}
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{t('story.title')}</h2>
          <p className="text-lg leading-relaxed text-[var(--muted-foreground)]">
            {t('story.body')}
          </p>
          <div className="justify-self-start">
            <ArrowLink href={getCatalogPath(locale)}>{t('story.cta')}</ArrowLink>
          </div>
        </div>
      </section>
    </main>
  );
}
