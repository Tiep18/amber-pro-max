'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, FileText, Search } from 'lucide-react';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export type AdminBlogPost = {
  id: string;
  title: string;
  status: string;
  publishedAt: string | null;
  localized: { vi: boolean; en: boolean };
};

function publishingLabel(post: AdminBlogPost) {
  if (!post.publishedAt) return 'Unscheduled';
  const date = new Date(post.publishedAt);
  return `${date > new Date() ? 'Scheduled' : 'Published'} ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

function statusTone(status: string) {
  return status === 'published'
    ? ('success' as const)
    : status === 'draft'
      ? ('warning' as const)
      : ('default' as const);
}

function LocaleReadiness({ post }: { post: AdminBlogPost }) {
  return (
    <div className="flex gap-1.5">
      {(['vi', 'en'] as const).map((locale) => (
        <span
          key={locale}
          className={`inline-flex min-h-7 items-center gap-1 rounded-[var(--radius-control)] px-2 text-xs font-semibold ${post.localized[locale] ? 'bg-[var(--success-surface)] text-[var(--success)]' : 'bg-[var(--warning-surface)] text-[var(--warning)]'}`}
        >
          {post.localized[locale] ? <Check className="size-3" aria-hidden="true" /> : null}
          {locale.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export function BlogPostList({ posts }: { posts: AdminBlogPost[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(
    () =>
      posts.filter(
        (post) =>
          (!query.trim() || post.title.toLowerCase().includes(query.trim().toLowerCase())) &&
          (status === 'all' || post.status === status)
      ),
    [posts, query, status]
  );

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Content queue</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {filtered.length}/{posts.length}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            Drafts, scheduled posts, and published editorial content.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(210px,1fr)_145px]">
          <label className="relative">
            <span className="sr-only">Search blog posts</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search posts"
              className="min-h-10 pl-9 text-sm"
            />
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title={posts.length ? 'No posts match these filters.' : 'No blog posts yet.'}
          description={
            posts.length
              ? 'Change the search or status filter.'
              : 'Create the first localized editorial post.'
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[18%]" />
                <col className="w-[27%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/65 text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Post</th>
                  <th className="px-4 py-3">Languages</th>
                  <th className="px-4 py-3">Publishing</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-[var(--surface-muted)]/45">
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-semibold">{post.title}</p>
                        <AdminStatusPill tone={statusTone(post.status)}>
                          {post.status}
                        </AdminStatusPill>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <LocaleReadiness post={post} />
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--muted-foreground)]">
                      {publishingLabel(post)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Edit <span className="sr-only">{post.title}</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--border)] md:hidden">
            {filtered.map((post) => (
              <article key={post.id} className="grid gap-3 px-4 py-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{post.title}</h3>
                      <AdminStatusPill tone={statusTone(post.status)}>
                        {post.status}
                      </AdminStatusPill>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {publishingLabel(post)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)]"
                  >
                    <ArrowRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">Edit {post.title}</span>
                  </Link>
                </div>
                <LocaleReadiness post={post} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
