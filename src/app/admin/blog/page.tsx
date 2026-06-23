import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {getAdminBlogPosts} from '@/content/blog/queries';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await getAdminBlogPosts();

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin content</p>
          <h1 className="text-3xl font-semibold">Blog posts</h1>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          New post
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Drafts, scheduled posts, and published posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No blog posts yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {posts.map((post) => (
                <Link key={post.id} href={`/admin/blog/${post.id}`} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto]">
                  <span className="font-semibold">{post.title}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleString('en-US') : 'Unscheduled'}
                  </span>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold">{post.status}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
