import type {ReactNode} from 'react';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing, type Locale} from '@/i18n/routing';
import {getRequestMarket} from '@/catalog/page-context';
import {CartProvider} from '@/components/cart/cart-provider';
import {SiteFooter} from '@/components/site-footer';
import {SiteHeader} from '@/components/site-header';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const market = await getRequestMarket();

  return (
    <NextIntlClientProvider>
      <CartProvider locale={locale as Locale} market={market}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader locale={locale as Locale} />
          <div className="flex-1">{children}</div>
          <SiteFooter locale={locale as Locale} />
        </div>
      </CartProvider>
    </NextIntlClientProvider>
  );
}
