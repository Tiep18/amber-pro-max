import { getTranslations } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { Suspense } from 'react';
import { MARKET_COOKIE, resolveActiveMarket } from '@/catalog/market';
import { getCatalogPath, getLocalizedPath, type Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { CommerceContextSwitcher } from './commerce-context-switcher';
import { MiniCart } from './cart/mini-cart';
import { Sheet } from './ui/sheet';
import { Separator } from './ui/separator';

async function getHeaderUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) {
    return null;
  }
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return {
    email: user.email,
    isAdmin: Boolean(role)
  };
}

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [t, marketT, cookieStore, headerStore, headerUser] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('market'),
    cookies(),
    headers(),
    getHeaderUser()
  ]);
  const activeMarket = resolveActiveMarket({
    cookieMarket: cookieStore.get(MARKET_COOKIE)?.value,
    country: headerStore.get('x-vercel-ip-country')
  });
  const marketLabels = {
    label: marketT('label'),
    current: marketT('current'),
    options: {
      vn: `${marketT('shortVietnam')} / ${locale === 'vi' ? 'Tieng Viet' : 'Vietnamese'}`,
      intl: `${marketT('shortInternational')} / English`
    }
  };

  const links = [
    { href: getLocalizedPath('/', locale), label: t('home') },
    { href: getCatalogPath(locale), label: t('shop') }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:min-h-[72px] lg:px-10 xl:px-12">
        <div className="md:hidden">
          <Sheet triggerLabel={t('openMenu')} title={t('menu')} side="left">
            <div className="flex flex-col gap-5">
              <a href={getLocalizedPath('/', locale)} className="grid gap-0.5">
                <span className="text-xl font-semibold leading-tight">Ambertinybear</span>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  handmade with care
                </span>
              </a>
              <Separator />
              <nav aria-label={t('primary')} className="flex flex-col gap-1">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-semibold hover:bg-[var(--surface-muted)]"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <Separator />
              <CommerceContextSwitcher
                locale={locale}
                activeMarket={activeMarket}
                labels={marketLabels}
                className="w-full justify-between"
              />
              <Separator />
              <AccountMenu locale={locale} user={headerUser} mode="panel" />
            </div>
          </Sheet>
        </div>
        <a
          href={getLocalizedPath('/', locale)}
          className="grid min-w-0 gap-0.5 truncate text-base font-semibold sm:text-xl"
        >
          <span className="truncate">Ambertinybear</span>
          <span className="hidden text-xs font-semibold text-[var(--muted-foreground)] lg:block">
            handmade with care
          </span>
        </a>
        <nav aria-label={t('primary')} className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base hover:bg-[var(--surface-muted)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <CommerceContextSwitcher
                locale={locale}
                activeMarket={activeMarket}
                labels={marketLabels}
              />
            </Suspense>
          </div>
          <MiniCart locale={locale} />
          <div className="hidden md:block">
            <AccountMenu locale={locale} user={headerUser} />
          </div>
        </div>
      </div>
    </header>
  );
}
