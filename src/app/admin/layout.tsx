import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  Boxes,
  FileText,
  Home,
  LayoutDashboard,
  Megaphone,
  PackageCheck,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  TicketPercent,
  Truck,
  UnlockKeyhole
} from 'lucide-react';

const adminNavGroups = [
  {
    label: 'Daily operations',
    links: [
      { href: '/admin', label: 'Dashboard', description: 'Today view', icon: LayoutDashboard },
      {
        href: '/admin/orders',
        label: 'Orders',
        description: 'Payments and fulfillment',
        icon: ShoppingCart
      },
      { href: '/admin/catalog', label: 'Catalog', description: 'Products and media', icon: Boxes },
      {
        href: '/admin/catalog/taxonomy',
        label: 'Catalog taxonomy',
        description: 'Categories and tags',
        icon: Tag
      },
      { href: '/admin/reviews', label: 'Reviews', description: 'Moderation queue', icon: Star }
    ]
  },
  {
    label: 'Commerce controls',
    links: [
      {
        href: '/admin/discounts',
        label: 'Discounts',
        description: 'Promotion codes',
        icon: TicketPercent
      },
      {
        href: '/admin/shipping',
        label: 'Shipping',
        description: 'Manual fee profiles',
        icon: Truck
      },
      {
        href: '/admin/exceptions',
        label: 'Exceptions',
        description: 'Market requests',
        icon: UnlockKeyhole
      }
    ]
  },
  {
    label: 'Content and growth',
    links: [
      {
        href: '/admin/newsletter',
        label: 'Newsletter',
        description: 'Audience and consent',
        icon: Megaphone
      },
      { href: '/admin/blog', label: 'Blog', description: 'Localized content', icon: FileText },
      {
        href: '/admin/blog/taxonomy',
        label: 'Blog taxonomy',
        description: 'Categories and tags',
        icon: Tag
      },
      {
        href: '/admin/policies',
        label: 'Policies',
        description: 'Storefront trust copy',
        icon: PackageCheck
      }
    ]
  },
  {
    label: 'System',
    links: [
      {
        href: '/admin/launch',
        label: 'Launch',
        description: 'Readiness gates',
        icon: ArrowUpRight
      },
      {
        href: '/admin/operations',
        label: 'Operations',
        description: 'Errors and jobs',
        icon: Settings
      }
    ]
  }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6">
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
          <nav
            className="flex gap-4 overflow-x-auto px-4 py-4 sm:px-6 lg:flex-1 lg:flex-col lg:overflow-y-auto"
            aria-label="Admin navigation"
          >
            {adminNavGroups.map((group) => (
              <div key={group.label} className="min-w-[220px] lg:min-w-0">
                <p className="mb-2 px-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]"
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-semibold">{link.label}</span>
                          <span className="block truncate text-xs text-[var(--muted-foreground)]">
                            {link.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                Admin console
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
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
