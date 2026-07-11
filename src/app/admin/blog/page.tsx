import Link from 'next/link';
import { CircleCheck, FileText, FolderTree, PencilLine, Plus } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { BlogPostList, type AdminBlogPost } from '@/components/admin/blog/blog-post-list';
import { getAdminBlogPosts } from '@/content/blog/queries';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = (await getAdminBlogPosts()) as AdminBlogPost[];
  const metrics = [
    { label: 'Posts', value: posts.length, description: 'total content items', icon: FileText },
    {
      label: 'Drafts',
      value: posts.filter((post) => post.status === 'draft').length,
      description: 'needs editing',
      icon: PencilLine
    },
    {
      label: 'Published',
      value: posts.filter((post) => post.status === 'published').length,
      description: 'live or scheduled',
      icon: CircleCheck
    }
  ];

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin content"
        title="Blog posts"
        description="Manage localized editorial content."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/blog/taxonomy"
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold hover:bg-[var(--surface-muted)]"
            >
              <FolderTree className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Taxonomy</span>
            </Link>
            <Link
              href="/admin/blog/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              New post
            </Link>
          </div>
        }
      />
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>
      <BlogPostList posts={posts} />
    </AdminPageShell>
  );
}
