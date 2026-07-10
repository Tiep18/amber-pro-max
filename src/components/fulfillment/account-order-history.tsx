import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';
import { formatAdminMoney, statusLabel } from '@/components/admin/orders/format';
import { getCatalogPath, getOrderPath, type Locale } from '@/i18n/routing';
import type { CustomerOrderHistoryItem } from '@/fulfillment/account-queries';

type Labels = {
  title: string;
  empty: string;
  total: string;
  payment: string;
  digital: string;
  physical: string;
  open: string;
};

const copy = {
  en: {
    emptyTitle: 'No orders yet',
    emptyBody:
      'When you buy a handmade item or PDF pattern, the order and fulfillment status will appear here.',
    shop: 'Visit the shop'
  },
  vi: {
    emptyTitle: 'Ban chua co don hang nao',
    emptyBody: 'Khi ban mua do handmade hoac pattern PDF, trang thai don va xu ly se hien o day.',
    shop: 'Ghe cua hang'
  }
} as const;

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes('paid') ||
    normalized.includes('delivered') ||
    normalized.includes('complete')
      ? 'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]'
      : normalized.includes('failed') ||
          normalized.includes('cancel') ||
          normalized.includes('reject')
        ? 'border-[var(--destructive)] bg-[var(--destructive-surface)] text-[var(--destructive)]'
        : normalized.includes('verifying') ||
            normalized.includes('packing') ||
            normalized.includes('shipped')
          ? 'border-[var(--warning)] bg-[var(--warning-surface)] text-[var(--warning)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]';

  return `inline-flex items-center rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${tone}`;
}

function formatCustomerDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === 'vi' ? 'Chua cap nhat' : 'Not updated yet';
  }
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function AccountOrderHistory({
  orders,
  locale,
  labels
}: {
  orders: CustomerOrderHistoryItem[];
  locale: Locale;
  labels: Labels;
}) {
  const t = copy[locale];

  return (
    <section className="grid gap-6">
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-[32px] font-semibold leading-tight">{labels.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {orders.length}{' '}
          {locale === 'vi' ? 'don hang' : orders.length === 1 ? 'order' : 'orders'}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="grid min-h-60 place-items-center rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-8 text-center">
          <div className="mx-auto grid max-w-[380px] justify-items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">{t.emptyTitle}</h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {labels.empty || t.emptyBody}
            </p>
            <Link
              href={getCatalogPath(locale)}
              className="mt-1 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              {t.shop}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              href={getOrderPath(locale, order.orderNumber)}
              className="group grid gap-4 border-b border-[var(--border)] py-5 transition-colors hover:border-[var(--accent)] sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{order.orderNumber}</p>
                  <span className={statusBadge(order.customerPaymentStatus)}>
                    {statusLabel(order.customerPaymentStatus)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatCustomerDate(order.updatedAt, locale)}
                </p>
              </div>

              <div className="grid gap-2 text-sm">
                <p className="grid grid-cols-[88px_1fr] gap-2">
                  <span className="font-medium text-[var(--muted-foreground)]">{labels.digital}</span>
                  <span className="font-semibold">{statusLabel(order.digitalFulfillmentStatus)}</span>
                </p>
                <p className="grid grid-cols-[88px_1fr] gap-2">
                  <span className="font-medium text-[var(--muted-foreground)]">{labels.physical}</span>
                  <span className="font-semibold">{statusLabel(order.physicalFulfillmentStatus)}</span>
                </p>
              </div>

              <div className="flex items-end justify-between gap-4 sm:min-w-[136px] sm:flex-col sm:items-end">
                <div className="grid gap-0.5 sm:text-right">
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {labels.total}
                  </span>
                  <strong className="text-lg leading-tight tabular-nums">
                    {formatAdminMoney(order.amountMinor, order.currencyCode)}
                  </strong>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                  {labels.open}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
