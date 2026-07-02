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
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold !text-[var(--surface)] shadow-[0_14px_34px_rgb(169_71_52/20%)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_42px_rgb(169_71_52/26%)] active:translate-y-0 active:scale-[0.99] sm:text-base"
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
    <section id={testId} data-testid={testId} className="grid scroll-mt-8 gap-7">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="grid max-w-2xl gap-2">
          <h2 className="text-3xl font-semibold leading-tight text-balance sm:text-4xl">{title}</h2>
          <p className="max-w-[62ch] text-pretty text-[var(--muted-foreground)]">{intro}</p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-1 font-semibold text-[var(--accent)] transition duration-200 hover:translate-x-1 hover:text-[var(--accent-hover)] focus-visible:px-3"
        >
          {linkLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
    <main className="overflow-hidden">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <section className="relative isolate mx-auto min-h-[530px] max-w-[1500px] overflow-hidden rounded-b-[28px] bg-[var(--background)] shadow-[var(--shadow-soft)] sm:min-h-[700px] lg:min-h-[760px]">
        <Image
          src="/images/home/hero-studio.png"
          alt={t('hero.imageAlt')}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[63%_top] saturate-[0.95] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,242,234,0)_0%,rgba(246,242,234,0.02)_34%,rgba(246,242,234,0.18)_66%,rgba(246,242,234,0.4)_100%)] sm:bg-[linear-gradient(90deg,rgba(246,242,234,0.94)_0%,rgba(246,242,234,0.72)_36%,rgba(246,242,234,0.16)_66%,rgba(246,242,234,0)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_56%,rgba(255,250,242,0.34),transparent_26rem)] sm:bg-[radial-gradient(circle_at_15%_58%,rgba(255,250,242,0.88),transparent_34rem)]" />
        <div className="container relative z-10 flex min-h-[530px] items-start pb-5 pt-[104px] sm:min-h-[700px] sm:items-center sm:py-24 lg:min-h-[760px]">
          <div className="grid max-w-[640px] gap-5 rounded-[22px] bg-[var(--surface)]/16 p-4 text-pretty shadow-[0_18px_55px_rgb(73_52_32/5%)] ring-1 ring-white/28 backdrop-blur-[1px] sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0 sm:backdrop-blur-0 lg:gap-6">
            <p className="w-fit rounded-[var(--radius-control)] bg-[var(--surface)]/58 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-sm ring-1 ring-white/55 backdrop-blur-[2px]">
              {t('paths.eyebrow')}
            </p>
            <h1 className="max-w-full break-words text-[44px] font-bold leading-[0.98] text-balance sm:text-[58px] lg:text-[66px] xl:text-[72px]">
              Ambertinybear
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed text-[var(--muted-foreground)] sm:text-xl">
              {t('hero.intro')}
            </p>
            <div className="flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <ArrowLink href="#shop-path-handmade" testId="hero-handmade-cta">
                {t('hero.handmadeCta')}
              </ArrowLink>
              <Link
                href="#shop-path-patterns"
                data-testid="hero-patterns-cta"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--foreground)]/20 bg-[var(--surface)]/56 px-5 py-3 text-sm font-semibold shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--foreground)]/40 hover:bg-[var(--surface)]/78 active:translate-y-0 active:scale-[0.99] sm:text-base"
              >
                {t('hero.patternCta')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="hidden gap-2 border-t border-[var(--border)]/80 pt-5 text-sm text-[var(--muted-foreground)] sm:grid sm:grid-cols-3">
              {benefits.map(({ title }) => (
                <span key={title} className="border-l border-[var(--accent)]/30 px-3 py-1.5">
                  {title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,var(--surface-paper),rgba(255,253,248,0.9))]">
        <div className="container py-16 sm:py-24">
          <section aria-labelledby="shop-paths-title" className="grid gap-9">
            <div className="grid max-w-3xl gap-3">
              <p className="text-sm font-semibold text-[var(--accent)]">{t('paths.eyebrow')}</p>
              <h2
                id="shop-paths-title"
                className="text-4xl font-semibold leading-tight text-balance sm:text-5xl"
              >
                {t('paths.title')}
              </h2>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <Link
                id="shop-path-handmade"
                href={handmadePath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-handmade"
                className="group relative grid scroll-mt-8 overflow-hidden rounded-[18px] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lifted)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]">
                  <Image
                    src="/images/home/handmade-category.png"
                    alt={t('paths.handmadeImageAlt')}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(38,35,31,0.62))]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 grid gap-2 p-5 text-white sm:p-7">
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">
                      {t('paths.handmadeTitle')}
                    </h3>
                    <span className="grid size-11 place-items-center rounded-full bg-white/90 text-[var(--accent)] transition duration-300 group-hover:translate-x-1">
                      <ArrowRight aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <p className="max-w-[54ch] text-sm leading-relaxed text-white/86 sm:text-base">
                    {t('paths.handmadeBody')}
                  </p>
                </div>
              </Link>
              <Link
                id="shop-path-patterns"
                href={patternPath}
                transitionTypes={['nav-forward']}
                data-testid="shop-path-patterns"
                className="group grid scroll-mt-8 gap-4 rounded-[18px] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lifted)] lg:mt-16"
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
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-semibold sm:text-3xl">
                      {t('paths.patternTitle')}
                    </h3>
                    <span className="grid size-10 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--accent)] transition duration-300 group-hover:translate-x-1">
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

      <section className="bg-[linear-gradient(180deg,var(--surface-blush),rgba(248,235,229,0.88))]">
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

      <section className="bg-[linear-gradient(180deg,var(--surface-sage),rgba(237,245,238,0.88))]">
        <div className="container py-16 sm:py-24">
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
      </section>

      <section className="bg-[linear-gradient(90deg,var(--trust-surface),var(--surface-sage),rgba(255,250,242,0.9))]">
        <div className="container grid gap-4 py-6 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="grid content-start gap-3 rounded-[16px] bg-white/38 p-5 ring-1 ring-white/50"
            >
              <div className="grid size-11 place-items-center rounded-[var(--radius-control)] bg-white/70">
                <Icon
                  aria-hidden="true"
                  className="size-6 text-[var(--trust-accent)]"
                  strokeWidth={1.75}
                />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,var(--surface-honey),rgba(255,250,242,0.94)_52%,var(--background))]">
        <div className="container grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)]">
            <Image
              src="/images/home/maker-story.png"
              alt={t('story.imageAlt')}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="grid gap-5 rounded-[18px] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)] ring-1 ring-white/70 sm:p-8 lg:-ml-12 lg:pl-24">
            <p className="text-sm font-semibold text-[var(--accent)]">{t('story.eyebrow')}</p>
            <h2 className="text-4xl font-semibold leading-tight text-balance sm:text-5xl">
              {t('story.title')}
            </h2>
            <p className="text-lg leading-relaxed text-pretty text-[var(--muted-foreground)]">
              {t('story.body')}
            </p>
            <div className="justify-self-start">
              <ArrowLink href={getCatalogPath(locale)}>{t('story.cta')}</ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
