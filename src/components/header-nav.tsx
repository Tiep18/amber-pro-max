'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';

type HeaderNavLink = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  const normalizedHref = href.endsWith('/') && href.length > 1 ? href.slice(0, -1) : href;
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (normalizedPath === normalizedHref) {
    return true;
  }

  return normalizedHref.split('/').length > 2 && normalizedPath.startsWith(`${normalizedHref}/`);
}

export function HeaderNav({
  links,
  label,
  orientation = 'horizontal'
}: {
  links: HeaderNavLink[];
  label: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const pathname = usePathname() || '';

  return (
    <nav
      aria-label={label}
      className={orientation === 'vertical' ? 'flex flex-col gap-1' : 'hidden items-center gap-2 md:flex'}
    >
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            transitionTypes={active ? undefined : ['nav-forward']}
            className={cn(
              'inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base hover:bg-[var(--surface-muted)] aria-[current=page]:bg-[var(--surface-muted)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--accent)]',
              orientation === 'vertical' && 'font-semibold'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
