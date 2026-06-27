import Link from 'next/link';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { BlogPostForm } from '@/components/admin/blog/blog-post-form';
import { getBlogOptions, getBlogPostForForm } from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({
  params,
  searchParams
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { postId } = await params;
  const { saved } = await searchParams;
  const [options, initialPost] = await Promise.all([getBlogOptions(), getBlogPostForForm(postId)]);

  return (
    <AdminPageShell className="mx-auto max-w-[1040px]">
      <Link
        href="/admin/blog"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        Back to blog posts
      </Link>
      <AdminPageHeader
        eyebrow={initialPost.status}
        title="Edit blog post"
        description="Update localized content, metadata, publish timing, and storefront SEO support."
      />
      <BlogPostForm
        {...options}
        initialPost={initialPost}
        initialNotice={saved === '1' ? 'saved' : undefined}
      />
    </AdminPageShell>
  );
}
