'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Boxes,
  FileText,
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
import type { LucideIcon } from 'lucide-react';
import { selectActiveAdminHref } from '@/admin/navigation';
import { cn } from '@/lib/utils';

type AdminNavLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const adminNavGroups: Array<{ label: string; links: AdminNavLink[] }> = [
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

const navLinks = adminNavGroups.flatMap((group) => group.links);

export function AdminNavigation() {
  const pathname = usePathname();
  const currentHref = selectActiveAdminHref(
    pathname,
    navLinks.map((link) => link.href)
  );

  return (
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
              const active = currentHref === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-[inset_3px_0_0_var(--accent)]'
                      : 'hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{link.label}</span>
                    <span
                      className={cn(
                        'block truncate text-xs',
                        active ? 'text-[var(--accent)]/75' : 'text-[var(--muted-foreground)]'
                      )}
                    >
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
  );
}
