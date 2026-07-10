'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Heart, Home, LogOut, MapPin, Package, ScrollText, UserRound } from 'lucide-react';
import { signOutAction } from '@/auth/actions';
import {
  getAccountAddressesPath,
  getAccountOrdersPath,
  getAccountPatternsPath,
  getAccountWishlistPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { notifyStorefrontContextChanged } from '@/components/storefront-context';
import { cn } from '@/lib/utils';

type AccountShellLabels = {
  area: string;
  menu: string;
  verified: string;
  nav: {
    overview: string;
    orders: string;
    patterns: string;
    wishlist: string;
    addresses: string;
  };
  signOut: string;
};

const labels: Record<Locale, AccountShellLabels> = {
  en: {
    area: 'Account',
    menu: 'Account menu',
    verified: 'Signed in',
    nav: {
      overview: 'Overview',
      orders: 'Orders',
      patterns: 'Pattern library',
      wishlist: 'Wishlist',
      addresses: 'Addresses'
    },
    signOut: 'Sign out'
  },
  vi: {
    area: 'Tai khoan',
    menu: 'Menu tai khoan',
    verified: 'Da dang nhap',
    nav: {
      overview: 'Tong quan',
      orders: 'Don hang',
      patterns: 'Thu vien PDF',
      wishlist: 'Yeu thich',
      addresses: 'Dia chi'
    },
    signOut: 'Dang xuat'
  }
};

function initialFor(email: string) {
  return email.trim().slice(0, 1).toUpperCase() || 'A';
}

function accountNavItems(locale: Locale) {
  const t = labels[locale].nav;
  return [
    { href: getLocalizedPath('/account', locale), label: t.overview, icon: UserRound },
    { href: getAccountOrdersPath(locale), label: t.orders, icon: Package },
    { href: getAccountPatternsPath(locale), label: t.patterns, icon: ScrollText },
    { href: getAccountWishlistPath(locale), label: t.wishlist, icon: Heart },
    { href: getAccountAddressesPath(locale), label: t.addresses, icon: MapPin }
  ];
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/vi' && href !== '/en' && pathname.startsWith(`${href}/`));
}

function AccountProfile({ email, locale }: { email: string; locale: Locale }) {
  const t = labels[locale];

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] text-base font-semibold text-white shadow-[0_10px_24px_rgba(150,73,50,0.18)]">
        {initialFor(email)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{email}</p>
        <p className="text-xs font-medium text-[var(--muted-foreground)]">{t.verified}</p>
      </div>
    </div>
  );
}

function AccountNavigation({ locale, onNavigate }: { locale: Locale; onNavigate?: () => void }) {
  const pathname = usePathname() || '';
  const items = accountNavItems(locale);

  return (
    <nav aria-label={labels[locale].menu} className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
              active && 'bg-[var(--trust-surface)] text-[var(--foreground)]'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-2 h-6 w-1 rounded-r-full bg-transparent',
                active && 'bg-[var(--accent)]'
              )}
            />
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{item.label}</span>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60',
                active && 'opacity-60'
              )}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton({ locale }: { locale: Locale }) {
  return (
    <form action={signOutAction} onSubmit={() => notifyStorefrontContextChanged({ user: null })}>
      <input type="hidden" name="locale" value={locale} />
      <Button
        type="submit"
        variant="ghost"
        className="min-h-10 w-full justify-start gap-3 px-3 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {labels[locale].signOut}
      </Button>
    </form>
  );
}

function SidebarContent({ email, locale }: { email: string; locale: Locale }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <AccountProfile email={email} locale={locale} />
      <AccountNavigation locale={locale} />
      <Separator className="my-1" />
      <Link
        href={getLocalizedPath('/', locale)}
        className="flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        Ambertinybear
      </Link>
      <div className="mt-auto">
        <Separator />
        <div className="pt-3">
          <SignOutButton locale={locale} />
        </div>
      </div>
    </div>
  );
}

export function AccountShell({
  locale,
  email,
  children
}: {
  locale: Locale;
  email: string;
  children: ReactNode;
}) {
  const t = labels[locale];

  return (
    <main className="container grid gap-5 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-9 lg:py-10">
      <div className="lg:hidden">
        <Sheet
          triggerLabel={t.menu}
          title={t.area}
          side="left"
          showTriggerLabel
          triggerClassName="min-h-10 rounded-[var(--radius-control)] border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-[0_10px_30px_rgba(91,55,35,0.08)]"
          contentClassName="w-[min(360px,92vw)]"
          bodyClassName="p-4"
        >
          <SidebarContent email={email} locale={locale} />
        </Sheet>
      </div>
      <aside className="sticky top-24 hidden h-[calc(100dvh-7rem)] border-r border-[var(--border)] pr-5 lg:block">
        <SidebarContent email={email} locale={locale} />
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
