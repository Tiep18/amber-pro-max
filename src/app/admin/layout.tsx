import Link from 'next/link';
import type {ReactNode} from 'react';

const adminLinks = [
  {href: '/admin', label: 'Dashboard'},
  {href: '/admin/catalog', label: 'Catalog'},
  {href: '/admin/orders', label: 'Orders'},
  {href: '/admin/reviews', label: 'Reviews'},
  {href: '/admin/newsletter', label: 'Newsletter'},
  {href: '/admin/blog', label: 'Blog'},
  {href: '/admin/policies', label: 'Policies'},
  {href: '/admin/launch', label: 'Launch'},
  {href: '/admin/operations', label: 'Operations'}
];

export default function AdminLayout({children}: {children: ReactNode}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]" aria-label="Admin navigation">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-2 px-4 py-3 sm:px-6 lg:px-10">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
