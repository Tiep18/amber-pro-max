import Link from 'next/link';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { BlogPostForm } from '@/components/admin/blog/blog-post-form';
import { getBlogOptions } from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
  await requireAdmin();
  const options = await getBlogOptions();

  return (
    <AdminPageShell className="mx-auto max-w-[1040px]">
      <Link
        href="/admin/blog"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        Back to blog posts
      </Link>
      <AdminPageHeader
        eyebrow="Admin content"
        title="New blog post"
        description="Create localized content with publish timing, metadata, tags, and collections."
      />
      <BlogPostForm {...options} />
    </AdminPageShell>
  );
}
