import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Heart, MapPin, Package, ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/auth/guards';
import {
  getAccountAddressesPath,
  getAccountOrdersPath,
  getAccountPatternsPath,
  getAccountWishlistPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';

const overviewCopy = {
  en: {
    eyebrow: 'Account overview',
    orders: 'Track paid orders, payment state, and fulfillment progress.',
    patterns: 'Open your private PDF pattern downloads after payment.',
    wishlist: 'Review saved products with current price and stock.',
    addresses: 'Keep shipping details ready for future checkout.'
  },
  vi: {
    eyebrow: 'Tong quan tai khoan',
    orders: 'Theo doi don da thanh toan, trang thai va xu ly giao hang.',
    patterns: 'Mo cac link tai pattern PDF rieng sau khi thanh toan.',
    wishlist: 'Xem san pham da luu voi gia va ton kho hien tai.',
    addresses: 'Luu dia chi giao hang cho lan thanh toan sau.'
  }
} as const;

export async function renderAccountOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  setRequestLocale(locale);
  const user = await requireUser({ locale, next: getLocalizedPath('/account', locale) });
  const t = await getTranslations('account');
  const copy = overviewCopy[locale];
  const cards = [
    {
      href: getAccountOrdersPath(locale),
      title: locale === 'vi' ? 'Don hang' : 'Orders',
      body: copy.orders,
      icon: Package
    },
    {
      href: getAccountPatternsPath(locale),
      title: locale === 'vi' ? 'Thu vien PDF' : 'Pattern library',
      body: copy.patterns,
      icon: ScrollText
    },
    {
      href: getAccountWishlistPath(locale),
      title: locale === 'vi' ? 'Yeu thich' : 'Wishlist',
      body: copy.wishlist,
      icon: Heart
    },
    {
      href: getAccountAddressesPath(locale),
      title: locale === 'vi' ? 'Dia chi' : 'Addresses',
      body: copy.addresses,
      icon: MapPin
    }
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">{copy.eyebrow}</p>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">{t('intro')}</p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-[var(--radius-control)] border border-[var(--border)] p-4">
              <dt className="font-semibold text-[var(--muted-foreground)]">{t('email')}</dt>
              <dd className="mt-1 truncate text-base font-semibold">{user.email}</dd>
            </div>
            <div className="rounded-[var(--radius-control)] border border-[var(--border)] p-4">
              <dt className="font-semibold text-[var(--muted-foreground)]">{t('locale')}</dt>
              <dd className="mt-1 text-base font-semibold">{locale.toUpperCase()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--accent)]"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--accent)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.body}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
