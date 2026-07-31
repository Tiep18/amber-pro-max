import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  getBlogPath,
  getCatalogPath,
  getGuestOrderPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';
import { siteBrand } from '@/lib/site';
import { MiniCart } from './cart/mini-cart';
import { HeaderAccount } from './header-account';
import { HeaderMarket } from './header-market';
import { HeaderNav } from './header-nav';
import { Sheet } from './ui/sheet';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [t, marketT] = await Promise.all([
    getTranslations('navigation'),
    getTranslations('market')
  ]);
  const marketLabels = {
    trigger: marketT('contextTrigger'),
    language: marketT('language'),
    shoppingRegion: marketT('shoppingRegion'),
    helper: marketT('helper'),
    checking: marketT('checking'),
    checkingAgain: marketT('checkingAgain'),
    changing: marketT('changing'),
    failure: marketT('failure'),
    contextFailure: marketT('contextFailure'),
    retry: marketT('retry'),
    languages: {
      vi: marketT('languageVietnamese'),
      en: marketT('languageEnglish')
    },
    markets: {
      vn: marketT('vietnamVnd'),
      intl: marketT('internationalUsd')
    },
    marketShort: {
      vn: marketT('shortVietnam'),
      intl: marketT('shortInternational')
    }
  };

  const links = [
    { href: getLocalizedPath('/', locale), label: t('home') },
    { href: getCatalogPath(locale), label: t('shop') },
    { href: getBlogPath(locale), label: t('blog') },
    { href: getGuestOrderPath(locale), label: t('guestOrder') }
  ];
  const closeMenuLabel = locale === 'vi' ? 'Dong menu' : 'Close menu';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]/70 bg-[var(--surface)]/78 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/68">
      <div className="container flex min-h-16 items-center justify-between gap-3 py-2 lg:min-h-[68px]">
        <div className="md:hidden">
          <Sheet
            triggerLabel={t('openMenu')}
            title={
              <Image
                src={siteBrand.logo.src}
                alt={siteBrand.logo.alt}
                width={132}
                height={59}
                className="h-auto w-[100px]"
                priority
              />
            }
            closeLabel={closeMenuLabel}
            side="left"
            triggerVariant="ghost"
            triggerClassName="h-11 min-h-11 w-11 rounded-[12px] bg-transparent !px-0 shadow-none hover:bg-[var(--surface-muted)]/70 text-[var(--foreground)]"
            contentClassName="w-[min(390px,88vw)]"
            headerClassName="px-5"
            bodyClassName="p-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex-1 px-4 pt-3">
                <HeaderNav
                  links={links}
                  label={t('primary')}
                  orientation="vertical"
                  closeOnNavigate
                />
              </div>

              <div className="border-t border-[var(--border)]/30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <Suspense fallback={null}>
                  <HeaderMarket
                    locale={locale}
                    labels={marketLabels}
                    mode="mobile"
                  />
                </Suspense>
                <div className="mt-2.5 border-t border-[var(--border)]/25 pt-2.5">
                  <Suspense fallback={null}>
                    <HeaderAccount locale={locale} mode="panel" />
                  </Suspense>
                </div>
              </div>
            </div>
          </Sheet>
        </div>
        <Link
          href={getLocalizedPath('/', locale)}
          className="inline-flex min-w-0 items-center transition-opacity hover:opacity-[0.82]"
        >
          <Image
            src={siteBrand.logo.src}
            alt={siteBrand.logo.alt}
            width={146}
            height={65}
            className="h-auto w-[118px] sm:w-[132px]"
            priority
          />
        </Link>
        <HeaderNav links={links} label={t('primary')} />
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
