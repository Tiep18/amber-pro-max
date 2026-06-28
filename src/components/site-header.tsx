import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { getCatalogPath, getLocalizedPath, type Locale } from '@/i18n/routing';
import { MiniCart } from './cart/mini-cart';
import { HeaderAccount } from './header-account';
import { HeaderMarket } from './header-market';
import { Sheet } from './ui/sheet';
import { Separator } from './ui/separator';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [t, marketT] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('market')
  ]);
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
              <Link href={getLocalizedPath('/', locale)} className="grid gap-0.5">
                <span className="text-xl font-semibold leading-tight">Ambertinybear</span>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  handmade with care
                </span>
              </Link>
              <Separator />
              <nav aria-label={t('primary')} className="flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-semibold hover:bg-[var(--surface-muted)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Separator />
              <Suspense fallback={null}>
                <HeaderMarket
                  locale={locale}
                  labels={marketLabels}
                  className="w-full justify-between"
                />
              </Suspense>
              <Separator />
              <Suspense fallback={null}>
                <HeaderAccount locale={locale} mode="panel" />
              </Suspense>
            </div>
          </Sheet>
        </div>
        <Link
          href={getLocalizedPath('/', locale)}
          className="grid min-w-0 gap-0.5 truncate text-base font-semibold sm:text-xl"
        >
          <span className="truncate">Ambertinybear</span>
          <span className="hidden text-xs font-semibold text-[var(--muted-foreground)] lg:block">
            handmade with care
          </span>
        </Link>
        <nav aria-label={t('primary')} className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base hover:bg-[var(--surface-muted)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <HeaderMarket locale={locale} labels={marketLabels} />
            </Suspense>
          </div>
          <MiniCart locale={locale} />
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <HeaderAccount locale={locale} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
