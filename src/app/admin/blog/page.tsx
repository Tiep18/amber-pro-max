import Link from 'next/link';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill
} from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminBlogPosts } from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await getAdminBlogPosts();
  const draftCount = posts.filter((post) => post.status === 'draft').length;
  const publishedCount = posts.filter((post) => post.status === 'published').length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin content"
        title="Blog posts"
        description="Manage localized content that supports storefront SEO and launch readiness."
        action={
          <Link
            href="/admin/blog/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            New post
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Posts" value={posts.length} description="total content items" />
        <AdminMetricCard label="Drafts" value={draftCount} description="needs editing" />
        <AdminMetricCard label="Published" value={publishedCount} description="live or scheduled" />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-[var(--accent)]" aria-hidden="true" />
            <CardTitle>Content queue</CardTitle>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Drafts, scheduled posts, and published posts ordered by recent activity.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <AdminEmptyState
              icon={FileText}
              title="No blog posts yet."
              description="Create the first post when you are ready to build localized SEO content."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-6 py-3">Post</th>
                    <th className="px-4 py-3">Publish time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {posts.map((post) => (
                    <tr key={post.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                      <td className="px-6 py-4 align-top">
                        <p className="font-semibold">{post.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Edit localized blog content and metadata
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-[var(--muted-foreground)]">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleString('en-US')
                          : 'Unscheduled'}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <AdminStatusPill tone={post.status === 'published' ? 'success' : 'default'}>
                          {post.status}
                        </AdminStatusPill>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Edit
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
