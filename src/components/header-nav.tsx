'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type HeaderNavLink = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  const normalizedHref = href.endsWith('/') && href.length > 1 ? href.slice(0, -1) : href;
  const normalizedPath =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (normalizedPath === normalizedHref) {
    return true;
  }

  return normalizedHref.split('/').length > 2 && normalizedPath.startsWith(`${normalizedHref}/`);
}

export function HeaderNav({
  links,
  label,
  orientation = 'horizontal',
  closeOnNavigate = false
}: {
  links: HeaderNavLink[];
  label: string;
  orientation?: 'horizontal' | 'vertical';
  closeOnNavigate?: boolean;
}) {
  const pathname = usePathname() || '';

  return (
    <nav
      aria-label={label}
      className={
        orientation === 'vertical' ? 'flex flex-col gap-1' : 'hidden items-center gap-2 md:flex'
      }
    >
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);

        const linkElement = (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            transitionTypes={active ? undefined : ['nav-forward']}
            className={cn(
              'group relative inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--foreground)] after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-center after:scale-x-0 after:bg-[var(--accent)] after:transition-transform after:duration-200 aria-[current=page]:after:scale-x-100',
              orientation === 'vertical' &&
                'min-h-14 justify-between rounded-none border-b border-[var(--border)]/60 px-1 text-lg font-medium after:hidden hover:!text-[var(--accent)] aria-[current=page]:pl-4 aria-[current=page]:font-semibold',
              orientation === 'vertical' &&
                (active ? '!text-[var(--accent)]' : '!text-[var(--muted-foreground)]')
            )}
          >
            {orientation === 'vertical' ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-4 left-0 w-0.5 rounded-full bg-transparent transition-colors',
                  active && 'bg-[var(--accent)]'
                )}
              />
            ) : null}
            <span>{link.label}</span>
            {orientation === 'vertical' ? (
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 text-[var(--muted-foreground)]/70 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                strokeWidth={1.6}
              />
            ) : null}
          </Link>
        );

        return closeOnNavigate && orientation === 'vertical' ? (
          <SheetClose key={link.href} asChild>
            {linkElement}
          </SheetClose>
        ) : (
          linkElement
        );
      })}
    </nav>
  );
}
