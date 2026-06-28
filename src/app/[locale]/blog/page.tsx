import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { publicStorageUrl } from '@/catalog/metadata';
import { getBlogPostPath, type Locale } from '@/i18n/routing';
import { getCachedPublishedBlogPosts } from '@/content/blog/public-cache';

type Params = Promise<{ locale: Locale }>;

export const dynamic = 'force-static';
export const revalidate = 300;

export default async function BlogIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await getCachedPublishedBlogPosts(locale);

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:px-10 xl:px-12">
      <div className="grid max-w-[760px] gap-3">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">
          {locale === 'vi' ? 'Bai viet' : 'Blog'}
        </p>
        <h1 className="text-[28px] font-semibold leading-tight">
          {locale === 'vi' ? 'Bai viet amigurumi' : 'Amigurumi blog'}
        </h1>
        <p className="text-[var(--muted-foreground)]">
          {locale === 'vi'
            ? 'Huong dan, cau chuyen va ghi chu cham soc cho san pham moc.'
            : 'Guides, stories, and care notes for handmade crochet work.'}
        </p>
      </div>
      {posts.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted-foreground)]">
          {locale === 'vi' ? 'Chua co bai viet cong khai.' : 'No public blog posts yet.'}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const imageUrl = publicStorageUrl(post.socialImageBucket, post.socialImagePath);
            return (
              <a
                key={post.postId}
                href={getBlogPostPath(locale, post.slug)}
                className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]"
              >
                {imageUrl ? (
                  <span className="relative block aspect-video">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <span className="grid gap-3 p-5">
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    {post.categoryName}
                  </span>
                  <span className="text-xl font-semibold">{post.title}</span>
                  <span className="text-[var(--muted-foreground)]">{post.description}</span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
