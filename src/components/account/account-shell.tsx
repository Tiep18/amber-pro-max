'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, LogOut, MapPin, Package, ScrollText, UserRound } from 'lucide-react';
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
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-base font-semibold text-white">
        {initialFor(email)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{email}</p>
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">{t.verified}</p>
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
              'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
              active && 'bg-[var(--surface-muted)] text-[var(--foreground)]'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-2 h-7 w-1 rounded-r-full bg-transparent',
                active && 'bg-[var(--accent)]'
              )}
            />
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
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
        className="w-full justify-start gap-3 px-3 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {labels[locale].signOut}
      </Button>
    </form>
  );
}

function SidebarContent({ email, locale }: { email: string; locale: Locale }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <AccountProfile email={email} locale={locale} />
      <AccountNavigation locale={locale} />
      <Separator />
      <Link
        href={getLocalizedPath('/', locale)}
        className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
    <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-10">
      <div className="lg:hidden">
        <Sheet triggerLabel={t.menu} title={t.area} side="left" showTriggerLabel>
          <SidebarContent email={email} locale={locale} />
        </Sheet>
      </div>
      <aside className="sticky top-24 hidden h-[calc(100dvh-7rem)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm lg:block">
        <SidebarContent email={email} locale={locale} />
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
