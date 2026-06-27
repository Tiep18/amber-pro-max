import { getTranslations } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { Suspense } from 'react';
import { MARKET_COOKIE, resolveActiveMarket } from '@/catalog/market';
import { getCatalogPath, getLocalizedPath, type Locale } from '@/i18n/routing';
import { LocaleSwitcher } from './locale-switcher';
import { MarketSwitcher } from './market-switcher';
import { MiniCart } from './cart/mini-cart';
import { Sheet } from './ui/sheet';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [t, marketT, cookieStore, headerStore] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('market'),
    cookies(),
    headers()
  ]);
  const activeMarket = resolveActiveMarket({
    cookieMarket: cookieStore.get(MARKET_COOKIE)?.value,
    country: headerStore.get('x-vercel-ip-country')
  });
  const marketLabels = {
    label: marketT('label'),
    current: marketT('current'),
    markets: {
      vn: marketT('vietnam'),
      intl: marketT('international')
    },
    short: {
      vn: marketT('shortVietnam'),
      intl: marketT('shortInternational')
    },
    switchTo: {
      vn: marketT('switchToVietnam'),
      intl: marketT('switchToInternational')
    }
  };

  const links = [
    { href: getLocalizedPath('/', locale), label: t('home') },
    { href: getCatalogPath(locale), label: t('shop') },
    { href: getLocalizedPath('/sign-in', locale), label: t('signIn') }
  ];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:flex-nowrap sm:gap-4 sm:px-6 lg:min-h-[72px] lg:px-10 xl:px-12">
        <a
          href={getLocalizedPath('/', locale)}
          className="min-w-0 truncate text-base font-semibold sm:text-xl"
        >
          Ambertinybear
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
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block">
            <MarketSwitcher activeMarket={activeMarket} labels={marketLabels} />
          </div>
          <nav aria-label={marketLabels.label} className="md:hidden">
            <span className="text-xs font-semibold text-[var(--accent)]">
              {marketLabels.markets[activeMarket]}
            </span>
          </nav>
          <MiniCart locale={locale} />
          <Suspense fallback={null}>
            <LocaleSwitcher locale={locale} />
          </Suspense>
          <Sheet triggerLabel={t('openMenu')} title={t('menu')}>
            <div className="flex flex-col gap-4">
              <MarketSwitcher
                activeMarket={activeMarket}
                labels={marketLabels}
                className="w-full justify-between"
              />
              <nav aria-label={t('primary')} className="flex flex-col gap-2">
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
            </div>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
