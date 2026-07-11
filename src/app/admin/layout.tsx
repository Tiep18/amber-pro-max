import Link from 'next/link';
import type { ReactNode } from 'react';
import { Home } from 'lucide-react';
import { AdminNavigation } from '@/components/admin/admin-navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--border)] px-4 py-3 sm:px-6">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] text-sm font-bold text-white">
                AP
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-tight">Amber Admin</span>
                <span className="block truncate text-sm text-[var(--muted-foreground)]">
                  Store operations
                </span>
              </span>
            </Link>
          </div>
          <AdminNavigation />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <p className="shrink-0 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                Admin console
              </p>
              <span className="hidden h-4 w-px bg-[var(--border)] sm:block" aria-hidden="true" />
              <p className="hidden truncate text-sm text-[var(--muted-foreground)] sm:block">
                Fast access to daily store work
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
            >
              <Home className="size-4" aria-hidden="true" />
              Storefront
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
