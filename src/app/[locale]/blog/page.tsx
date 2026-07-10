import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, ShoppingBag } from 'lucide-react';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/content/seo/json-ld';
import { getBlogPath, getBlogPostPath, getCatalogPath, type Locale } from '@/i18n/routing';
import { getCachedPublishedBlogPosts } from '@/content/blog/public-cache';

type Params = Promise<{ locale: Locale }>;

export const dynamic = 'force-static';
export const revalidate = 300;

const blogCopy = {
  en: {
    eyebrow: 'Studio journal',
    title: 'Crochet notes with a maker’s point of view',
    intro: 'Guides, stories, and care notes for handmade crochet work.',
    empty: 'No public blog posts yet.',
    featured: 'Featured note',
    latest: 'Latest notes',
    read: 'Read article',
    shop: 'Browse the shop',
    metadataTitle: 'Amigurumi blog',
    metadataDescription: 'Guides, stories, and care notes for handmade crochet work.'
  },
  vi: {
    eyebrow: 'Nhat ky studio',
    title: 'Ghi chu moc len tu goc nhin nguoi lam',
    intro: 'Huong dan, cau chuyen va ghi chu cham soc cho san pham moc.',
    empty: 'Chua co bai viet cong khai.',
    featured: 'Bai viet noi bat',
    latest: 'Ghi chu moi',
    read: 'Doc bai viet',
    shop: 'Ghe cua hang',
    metadataTitle: 'Bai viet amigurumi',
    metadataDescription: 'Huong dan, cau chuyen va ghi chu cham soc cho san pham moc.'
  }
} as const;

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === 'vi' ? 'Chua cap nhat' : 'Not dated';
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = blogCopy[locale];

  return localizedMetadata({
    title: t.metadataTitle,
    description: t.metadataDescription,
    canonicalPath: getBlogPath(locale),
    alternatePaths: {
      vi: getBlogPath('vi'),
      en: getBlogPath('en')
    }
  });
}

export default async function BlogIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await getCachedPublishedBlogPosts(locale);
  const t = blogCopy[locale];
  const [featuredPost, ...restPosts] = posts;
  const featuredImageUrl = featuredPost
    ? publicStorageUrl(featuredPost.socialImageBucket, featuredPost.socialImagePath)
    : undefined;

  return (
    <main className="container grid gap-10 py-10 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
            { name: t.metadataTitle, path: getBlogPath(locale) }
          ]),
          itemListJsonLd(posts.map((post) => ({ name: post.title, path: getBlogPostPath(locale, post.slug) })))
        ]}
      />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(280px,0.34fr)] lg:items-end">
        <div className="grid max-w-[820px] gap-3">
          <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="max-w-[13ch] text-[40px] font-semibold leading-[1.02] sm:text-[56px] lg:max-w-[15ch]">
            {t.title}
          </h1>
          <p className="max-w-[62ch] text-base leading-7 text-[var(--muted-foreground)]">{t.intro}</p>
        </div>
        <Link
          href={getCatalogPath(locale)}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {t.shop}
        </Link>
      </section>

      {posts.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted-foreground)]">
          {t.empty}
        </p>
      ) : (
        <div className="grid gap-8">
          {featuredPost ? (
            <Link
              href={getBlogPostPath(locale, featuredPost.slug)}
              className="group grid overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_24px_70px_rgba(91,55,35,0.09)] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]"
            >
              {featuredImageUrl ? (
                <span className="relative block min-h-[280px] lg:min-h-[430px]">
                  <Image
                    src={featuredImageUrl}
                    alt={featuredPost.title}
                    fill
                    priority
                    sizes="(min-width: 1024px) 54vw, 100vw"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="grid min-h-[280px] place-items-center bg-[var(--surface-muted)] text-[var(--accent)]">
                  <BookOpen className="h-10 w-10" aria-hidden="true" />
                </span>
              )}
              <span className="grid content-center gap-5 p-6 sm:p-8">
                <span className="text-xs font-semibold text-[var(--accent)]">{t.featured}</span>
                <span className="grid gap-3">
                  <span className="text-sm font-semibold text-[var(--muted-foreground)]">{featuredPost.categoryName}</span>
                  <span className="text-[30px] font-semibold leading-tight sm:text-[40px]">{featuredPost.title}</span>
                  <span className="max-w-[58ch] text-base leading-7 text-[var(--muted-foreground)]">{featuredPost.description}</span>
                </span>
                <span className="flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {formatDate(featuredPost.publishedAt, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
                    {t.read}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </span>
            </Link>
          ) : null}

          {restPosts.length ? (
            <section className="grid gap-4">
              <h2 className="text-xl font-semibold">{t.latest}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restPosts.map((post) => {
                  const imageUrl = publicStorageUrl(post.socialImageBucket, post.socialImagePath);
                  return (
                    <Link
                      key={post.postId}
                      href={getBlogPostPath(locale, post.slug)}
                      className="group grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)]"
                    >
                      {imageUrl ? (
                        <span className="relative block aspect-[4/3]">
                          <Image
                            src={imageUrl}
                            alt={post.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </span>
                      ) : null}
                      <span className="grid gap-3 p-5">
                        <span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted-foreground)]">
                          <span>{post.categoryName}</span>
                          <span>{formatDate(post.publishedAt, locale)}</span>
                        </span>
                        <span className="text-xl font-semibold leading-tight">{post.title}</span>
                        <span className="text-sm leading-6 text-[var(--muted-foreground)]">{post.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
