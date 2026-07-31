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
        orientation === 'vertical' ? 'flex flex-col' : 'hidden items-center gap-2 md:flex'
      }
    >
      {links.map((link, index) => {
        const active = isActivePath(pathname, link.href);

        const linkElement = (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            transitionTypes={active ? undefined : ['nav-forward']}
            style={orientation === 'vertical' ? { '--nav-i': index } as React.CSSProperties : undefined}
            className={cn(
              'group relative inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--foreground)] after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-center after:scale-x-0 after:bg-[var(--accent)] after:transition-transform after:duration-200 aria-[current=page]:after:scale-x-100',
              orientation === 'vertical' &&
                'sheet-nav-item min-h-[44px] justify-between rounded-none border-b border-[var(--border)]/30 px-0 text-[15px] font-medium tracking-[-0.006em] after:hidden transition-colors duration-150',
              orientation === 'vertical' && active &&
                '!text-[var(--accent)]',
              orientation === 'vertical' && !active &&
                '!text-[var(--foreground)] hover:!text-[var(--accent)]'
            )}
          >
            {orientation === 'vertical' ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -left-4 inset-y-2.5 w-[2px] rounded-full transition-all duration-200',
                  active ? 'bg-[var(--accent)]' : 'bg-transparent'
                )}
              />
            ) : null}
            <span>{link.label}</span>
            {orientation === 'vertical' ? (
              <ArrowRight
                aria-hidden="true"
                className={cn(
                  'h-4 w-4 transition-all duration-150 group-hover:translate-x-0.5',
                  active
                    ? 'text-[var(--accent)]/50'
                    : 'text-[var(--muted-foreground)]/30 group-hover:text-[var(--accent)]/50'
                )}
                strokeWidth={1.5}
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
