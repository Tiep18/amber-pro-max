import type {Metadata} from 'next';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {localizedMetadata, publicStorageUrl} from '@/catalog/metadata';
import {getBlogPostPath, getProductPath, type Locale} from '@/i18n/routing';
import {getPublishedBlogPostBySlug} from '@/content/blog/queries';

type Params = Promise<{locale: Locale; postSlug: string}>;

export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, postSlug} = await params;
  const post = await getPublishedBlogPostBySlug({locale, slug: postSlug});
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

export default async function BlogPostPage({params}: {params: Params}) {
  const {locale, postSlug} = await params;
  setRequestLocale(locale);
  const post = await getPublishedBlogPostBySlug({locale, slug: postSlug});
  if (!post) {
    notFound();
  }
  const imageUrl = publicStorageUrl(post.socialImageBucket, post.socialImagePath);

  return (
    <main className="mx-auto grid w-full max-w-[940px] gap-8 px-4 py-10 sm:px-6 lg:px-10">
      <article className="grid gap-6">
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">{post.categoryName}</p>
          <h1 className="text-[28px] font-semibold leading-tight">{post.title}</h1>
          <p className="text-[var(--muted-foreground)]">{post.description}</p>
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="aspect-video w-full rounded-[var(--radius-card)] object-cover" />
        ) : null}
        {post.tags.length ? (
          <div className="flex flex-wrap gap-2" aria-label={locale === 'vi' ? 'The bai viet' : 'Blog tags'}>
            {post.tags.map((tag) => (
              <span key={tag.slug} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold">
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 leading-7">
          {post.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
      {post.relatedProducts.length ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">{locale === 'vi' ? 'San pham lien quan' : 'Related products'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {post.relatedProducts.map((product) => (
              <a
                key={product.productId}
                href={getProductPath(locale, product.slug)}
                className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4 font-semibold transition hover:border-[var(--accent)]"
              >
                {product.title}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
