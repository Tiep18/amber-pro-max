import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { BlogPostForm } from '@/components/admin/blog/blog-post-form';
import { getBlogOptions } from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
  await requireAdmin();
  const options = await getBlogOptions();

  return (
    <AdminPageShell className="mx-auto max-w-[1180px]">
      <Link
        href="/admin/blog"
        className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[var(--accent)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to blog posts
      </Link>
      <AdminPageHeader
        eyebrow="Admin content"
        title="New blog post"
        description="Create bilingual editorial content and publishing settings."
      />
      <BlogPostForm {...options} />
    </AdminPageShell>
  );
}
