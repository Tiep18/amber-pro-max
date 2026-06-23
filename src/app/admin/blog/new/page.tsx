import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {BlogPostForm} from '@/components/admin/blog/blog-post-form';
import {getBlogOptions} from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
  await requireAdmin();
  const options = await getBlogOptions();

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <Link href="/admin/blog" className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]">
        Back to blog posts
      </Link>
      <h1 className="mb-6 text-3xl font-semibold">New blog post</h1>
      <BlogPostForm {...options} />
    </main>
  );
}
