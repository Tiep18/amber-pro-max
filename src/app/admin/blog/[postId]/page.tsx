import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {BlogPostForm} from '@/components/admin/blog/blog-post-form';
import {getBlogOptions, getBlogPostForForm} from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({
  params,
  searchParams
}: {
  params: Promise<{postId: string}>;
  searchParams: Promise<{saved?: string}>;
}) {
  await requireAdmin();
  const {postId} = await params;
  const {saved} = await searchParams;
  const [options, initialPost] = await Promise.all([getBlogOptions(), getBlogPostForForm(postId)]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <Link href="/admin/blog" className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]">
        Back to blog posts
      </Link>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">{initialPost.status}</p>
        <h1 className="text-3xl font-semibold">Edit blog post</h1>
      </div>
      <BlogPostForm {...options} initialPost={initialPost} initialNotice={saved === '1' ? 'saved' : undefined} />
    </main>
  );
}
