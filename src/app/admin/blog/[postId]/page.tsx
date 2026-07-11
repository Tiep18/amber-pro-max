import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <AdminPageShell className="mx-auto">
      <Link
        href="/admin/blog"
        className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[var(--accent)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to blog posts
      </Link>
      <AdminPageHeader
        eyebrow={initialPost.status}
        title="Edit blog post"
        description="Update bilingual content and publishing settings."
      />
      <BlogPostForm
        {...options}
        initialPost={initialPost}
        initialNotice={saved === '1' ? 'saved' : undefined}
      />
    </AdminPageShell>
  );
}
