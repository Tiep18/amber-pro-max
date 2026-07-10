import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, ShoppingBag, Tag } from 'lucide-react';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from '@/content/seo/json-ld';
import { getBlogPath, getBlogPostPath, getCatalogPath, getProductPath, type Locale } from '@/i18n/routing';
import { getCachedPublishedBlogPost, getCachedPublishedBlogPosts } from '@/content/blog/public-cache';

type Params = Promise<{ locale: Locale; postSlug: string }>;

export const dynamic = 'force-static';
export const revalidate = 300;

const postCopy = {
  en: {
    blog: 'Blog',
    back: 'Back to blog',
    related: 'Related products',
    shopCtaTitle: 'Find the pattern or handmade piece behind the story',
    shopCtaBody: 'Browse current crochet goods, PDF patterns, and small-batch handmade pieces.',
    shopCta: 'Visit the shop',
    published: 'Published'
  },
  vi: {
    blog: 'Bai viet',
    back: 'Quay lai bai viet',
    related: 'San pham lien quan',
    shopCtaTitle: 'Tim pattern hoac mon handmade trong cau chuyen',
    shopCtaBody: 'Xem do moc, pattern PDF va san pham handmade so luong nho hien co.',
    shopCta: 'Ghe cua hang',
    published: 'Dang ngay'
  }
} as const;

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === 'vi' ? 'Chua cap nhat' : 'Not dated';
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, postSlug } = await params;
  const post = await getCachedPublishedBlogPost(locale, postSlug);
  if (!post || !post.localizedSlugs.vi || !post.localizedSlugs.en) {
    return {};
  }

  return localizedMetadata({
    title: post.title,
    description: post.description,
    canonicalPath: getBlogPostPath(locale, post.slug),
    alternatePaths: {
      vi: getBlogPostPath('vi', post.localizedSlugs.vi),
      en: getBlogPostPath('en', post.localizedSlugs.en)
    },
    socialImage: publicStorageUrl(post.socialImageBucket, post.socialImagePath)
  });
}

export async function generateStaticParams() {
  const locales: Locale[] = ['vi', 'en'];
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const posts = await getCachedPublishedBlogPosts(locale);
      return posts.map((post) => ({ locale, postSlug: post.slug }));
    })
  );
  return entries.flat();
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, postSlug } = await params;
  setRequestLocale(locale);
  const post = await getCachedPublishedBlogPost(locale, postSlug);
  if (!post) {
    notFound();
  }
  const imageUrl = publicStorageUrl(post.socialImageBucket, post.socialImagePath);

  const postPath = getBlogPostPath(locale, post.slug);
  const t = postCopy[locale];
  const paragraphs = post.body.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            headline: post.title,
            description: post.description,
            path: postPath,
            image: imageUrl,
            datePublished: post.publishedAt
          }),
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            {
              name: t.blog,
              path: getBlogPath(locale)
            },
            { name: post.title, path: postPath }
          ])
        ]}
      />
      <main className="container grid gap-10 py-10 sm:py-12">
        <article className="grid gap-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(260px,0.32fr)] lg:items-end">
            <div className="grid max-w-[860px] gap-4">
              <Link
                href={getBlogPath(locale)}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.back}
              </Link>
              <div className="grid gap-3">
                <p className="text-xs font-semibold text-[var(--accent)]">{post.categoryName}</p>
                <h1 className="text-[40px] font-semibold leading-[1.02] sm:text-[56px]">{post.title}</h1>
                <p className="max-w-[68ch] text-base leading-7 text-[var(--muted-foreground)]">{post.description}</p>
              </div>
            </div>
            <dl className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <dt>{t.published}</dt>
              </div>
              <dd className="font-semibold">{formatDate(post.publishedAt, locale)}</dd>
            </dl>
          </div>
          {imageUrl ? (
            <span className="relative block aspect-[16/9] overflow-hidden rounded-[24px]">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 1280px) 1180px, 100vw"
                className="object-cover"
              />
            </span>
          ) : null}
          {post.tags.length ? (
            <div
              className="mx-auto flex w-full max-w-[760px] flex-wrap gap-2"
              aria-label={locale === 'vi' ? 'The bai viet' : 'Blog tags'}
            >
              {post.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="inline-flex min-h-8 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-sm font-semibold"
                >
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mx-auto grid w-full max-w-[760px] gap-5 text-[17px] leading-8 text-[var(--foreground)]">
            {paragraphs.map((paragraph, index) => (
              <p
                key={paragraph}
                className={index === 0 ? 'text-xl leading-9 text-[var(--muted-foreground)]' : undefined}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>
        {post.relatedProducts.length ? (
          <section className="mx-auto grid w-full max-w-[900px] gap-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-2xl font-semibold">{t.related}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {post.relatedProducts.map((product) => (
                <Link
                  key={product.productId}
                  href={getProductPath(locale, product.slug)}
                  className="group grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 font-semibold transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)]"
                >
                  <span>{product.title}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
                    {t.shopCta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <section className="mx-auto grid w-full max-w-[900px] gap-4 rounded-[24px] bg-[var(--surface-muted)] p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7">
          <div className="grid gap-2">
            <h2 className="text-2xl font-semibold">{t.shopCtaTitle}</h2>
            <p className="max-w-[60ch] text-sm leading-6 text-[var(--muted-foreground)]">{t.shopCtaBody}</p>
          </div>
          <Link
            href={getCatalogPath(locale)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {t.shopCta}
          </Link>
        </section>
      </main>
    </>
  );
}
