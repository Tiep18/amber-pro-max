import Link from 'next/link';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { signOutAction } from '@/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  getAccountOrdersPath,
  getAccountPatternsPath,
  getAccountWishlistPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';

type HeaderUser = {
  email: string;
  isAdmin: boolean;
};

const labels = {
  en: {
    signIn: 'Sign in',
    account: 'Account',
    orders: 'Orders',
    patterns: 'Purchased patterns',
    wishlist: 'Wishlist',
    admin: 'Admin dashboard',
    adminBadge: 'Admin',
    signOut: 'Sign out'
  },
  vi: {
    signIn: 'Dang nhap',
    account: 'Tai khoan',
    orders: 'Don hang',
    patterns: 'Mau PDF da mua',
    wishlist: 'Yeu thich',
    admin: 'Trang admin',
    adminBadge: 'Admin',
    signOut: 'Dang xuat'
  }
} as const;

function initialFor(email: string) {
  return email.trim().slice(0, 1).toUpperCase() || 'A';
}

function MenuItem({
  href,
  icon: Icon,
  children,
  asDropdown = false
}: {
  href: string;
  icon: typeof UserRound;
  children: string;
  asDropdown?: boolean;
}) {
  if (asDropdown) {
    return (
      <DropdownMenuItem asChild>
        <Link href={href} className="flex min-h-10 items-center gap-2.5 rounded-sm font-medium">
          <Icon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          <span>{children}</span>
        </Link>
      </DropdownMenuItem>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
    >
      <Icon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

function AccountLinks({ locale, asDropdown = false }: { locale: Locale; asDropdown?: boolean }) {
  const t = labels[locale];

  return (
    <>
      <MenuItem
        href={getLocalizedPath('/account', locale)}
        icon={UserRound}
        asDropdown={asDropdown}
      >
        {t.account}
      </MenuItem>
      <MenuItem href={getAccountOrdersPath(locale)} icon={Package} asDropdown={asDropdown}>
        {t.orders}
      </MenuItem>
      <MenuItem href={getAccountPatternsPath(locale)} icon={Package} asDropdown={asDropdown}>
        {t.patterns}
      </MenuItem>
      <MenuItem href={getAccountWishlistPath(locale)} icon={Heart} asDropdown={asDropdown}>
        {t.wishlist}
      </MenuItem>
    </>
  );
}

export function AccountMenu({
  locale,
  user,
  mode = 'dropdown'
}: {
  locale: Locale;
  user: HeaderUser | null;
  mode?: 'dropdown' | 'panel';
}) {
  const t = labels[locale];

  if (!user) {
    return (
      <Link
        href={getLocalizedPath('/sign-in', locale)}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
      >
        {t.signIn}
      </Link>
    );
  }

  if (mode === 'panel') {
    return (
      <div className="grid gap-1">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t.account}</p>
            {user.isAdmin ? (
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                {t.adminBadge}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email}</p>
        </div>
        <AccountLinks locale={locale} />
        {user.isAdmin ? (
          <>
            <div className="my-1 h-px bg-[var(--border)]" />
            <MenuItem href="/admin" icon={LayoutDashboard}>
              {t.admin}
            </MenuItem>
          </>
        ) : null}
        <form action={signOutAction} className="border-t border-[var(--border)] pt-1">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-sm font-semibold text-[var(--destructive)] hover:bg-[var(--destructive-surface)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t.signOut}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.account}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-2 shadow-sm transition-colors hover:bg-[var(--surface-muted)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white">
            {initialFor(user.email)}
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-[var(--muted-foreground)] sm:block"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[280px] rounded-[var(--radius-card)] border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--foreground)] shadow-xl"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-semibold text-white">
            {initialFor(user.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-5">{t.account}</span>
            <span className="block truncate text-xs font-normal text-[var(--muted-foreground)]">
              {user.email}
            </span>
          </span>
          {user.isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--muted-foreground)]">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t.adminBadge}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <AccountLinks locale={locale} asDropdown />
        </DropdownMenuGroup>
        {user.isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <MenuItem href="/admin" icon={LayoutDashboard} asDropdown>
                {t.admin}
              </MenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="flex min-h-10 w-full items-center gap-2.5 font-medium">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{t.signOut}</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
