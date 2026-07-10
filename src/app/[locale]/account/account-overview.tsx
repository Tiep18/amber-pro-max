import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Globe2, Heart, Mail, MapPin, Package, ScrollText } from 'lucide-react';
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
    <div className="grid gap-8">
      <section className="grid gap-6 border-b border-[var(--border)] pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-end">
        <div className="grid max-w-3xl gap-3">
          <p className="text-xs font-semibold text-[var(--accent)]">{copy.eyebrow}</p>
          <h1 className="max-w-[13ch] text-pretty text-[34px] font-semibold leading-[1.05] sm:max-w-none sm:text-[42px]">
            {t('title')}
          </h1>
          <p className="max-w-[64ch] text-pretty leading-relaxed text-[var(--muted-foreground)]">
            {t('intro')}
          </p>
        </div>
        <dl className="grid gap-3 text-sm">
          <div className="grid grid-cols-[32px_1fr] gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="font-medium text-[var(--muted-foreground)]">{t('email')}</dt>
              <dd className="mt-0.5 truncate font-semibold">{user.email}</dd>
            </div>
          </div>
          <div className="grid grid-cols-[32px_1fr] gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <dt className="font-medium text-[var(--muted-foreground)]">{t('locale')}</dt>
              <dd className="mt-0.5 font-semibold">{locale.toUpperCase()}</dd>
            </div>
          </div>
        </dl>
      </section>
      <section className="grid gap-3" aria-label={copy.eyebrow}>
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-[var(--border)] py-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-tight">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--muted-foreground)]">{item.body}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
