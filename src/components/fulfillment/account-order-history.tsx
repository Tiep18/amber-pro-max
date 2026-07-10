import Link from 'next/link';
import { ArrowRight, Clock3, Package, ReceiptText } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
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
    shop: 'Visit the shop',
    summary: 'Order timeline',
    updated: 'Updated',
    latest: 'Latest activity'
  },
  vi: {
    emptyTitle: 'Ban chua co don hang nao',
    emptyBody: 'Khi ban mua do handmade hoac pattern PDF, trang thai don va xu ly se hien o day.',
    shop: 'Ghe cua hang',
    summary: 'Dong thoi gian don',
    updated: 'Cap nhat',
    latest: 'Hoat dong gan nhat'
  }
} as const;

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  return (
    normalized.includes('paid') ||
    normalized.includes('delivered') ||
    normalized.includes('complete')
      ? 'success'
      : normalized.includes('failed') ||
          normalized.includes('cancel') ||
          normalized.includes('reject')
        ? 'danger'
        : normalized.includes('verifying') ||
            normalized.includes('packing') ||
            normalized.includes('shipped')
          ? 'warning'
          : 'neutral'
  );
}

function statusBadge(status: string) {
  const tone = statusTone(status);
  const className =
    tone === 'success'
      ? 'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]'
      : tone === 'danger'
        ? 'border-[var(--destructive)] bg-[var(--destructive-surface)] text-[var(--destructive)]'
        : tone === 'warning'
          ? 'border-[var(--warning)] bg-[var(--warning-surface)] text-[var(--warning)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]';

  return `inline-flex items-center rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${className}`;
}

function statusDot(status: string) {
  const tone = statusTone(status);

  return tone === 'success'
    ? 'bg-[var(--success)]'
    : tone === 'danger'
      ? 'bg-[var(--destructive)]'
      : tone === 'warning'
        ? 'bg-[var(--warning)]'
        : 'bg-[var(--muted-foreground)]';
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
  const latestOrder = orders[0] ?? null;

  return (
    <section className="grid gap-5">
      <header className="grid gap-4 border-b border-[var(--border)] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-[var(--accent)]">{t.summary}</p>
          <h1 className="text-[30px] font-semibold leading-tight sm:text-[34px]">{labels.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)] sm:justify-end">
          <span className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 font-semibold text-[var(--foreground)]">
            {orders.length} {locale === 'vi' ? 'don' : orders.length === 1 ? 'order' : 'orders'}
          </span>
          {latestOrder ? (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {t.latest}: {formatCustomerDate(latestOrder.updatedAt, locale)}
            </span>
          ) : null}
        </div>
      </header>

      {orders.length === 0 ? (
        <AccountEmptyState
          icon={<Package className="h-5 w-5" aria-hidden="true" />}
          title={t.emptyTitle}
          body={labels.empty || t.emptyBody}
          cta={{href: getCatalogPath(locale), label: t.shop}}
        />
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              href={getOrderPath(locale, order.orderNumber)}
              className="group relative grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)] sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.46fr)_auto] sm:p-5"
            >
              <span
                className={`absolute left-0 top-5 h-12 w-1 rounded-r-full ${statusDot(order.customerPaymentStatus)}`}
                aria-hidden="true"
              />
              <div className="min-w-0 pl-1 sm:pl-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
                    <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <span className={statusBadge(order.customerPaymentStatus)}>
                    {statusLabel(order.customerPaymentStatus)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {t.updated}: {formatCustomerDate(order.updatedAt, locale)}
                </p>
              </div>

              <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-sm leading-6">
                <p className="grid grid-cols-[88px_1fr] gap-2">
                  <span className="font-medium text-[var(--muted-foreground)]">{labels.payment}</span>
                  <span className="font-semibold">{statusLabel(order.customerPaymentStatus)}</span>
                </p>
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
                <span className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-control)] px-2 text-sm font-semibold text-[var(--accent)] transition-colors group-hover:bg-[var(--surface-muted)]">
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
