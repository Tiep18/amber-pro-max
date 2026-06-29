import { Suspense, type ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { CartProvider } from '@/components/cart/cart-provider';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { StorefrontContextProvider } from '@/components/storefront-context';
import { WishlistProvider } from '@/components/wishlist-context';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  return (
    <CartProvider locale={locale as Locale}>
      <StorefrontContextProvider locale={locale as Locale}>
        <WishlistProvider locale={locale as Locale}>
          <div className="flex min-h-screen flex-col">
            <a
              href="#main-content"
              className="sr-only fixed left-4 top-4 z-[60] rounded-[var(--radius-control)] bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white focus:not-sr-only"
            >
              {locale === 'vi' ? 'Bo qua den noi dung' : 'Skip to content'}
            </a>
            <Suspense fallback={<div className="min-h-16 border-b border-[var(--border)]" />}>
              <SiteHeader locale={locale as Locale} />
            </Suspense>
            <div id="main-content" className="flex-1">
              {children}
            </div>
            <SiteFooter locale={locale as Locale} />
          </div>
        </WishlistProvider>
      </StorefrontContextProvider>
    </CartProvider>
  );
}
