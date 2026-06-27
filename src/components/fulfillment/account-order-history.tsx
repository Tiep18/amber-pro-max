import Link from 'next/link';
import { Package } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAdminDate, formatAdminMoney, statusLabel } from '@/components/admin/orders/format';
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

  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`;
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            {orders.length}{' '}
            {locale === 'vi' ? 'don hang' : orders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <AccountEmptyState
            icon={<Package className="h-6 w-6" aria-hidden="true" />}
            title={t.emptyTitle}
            body={labels.empty || t.emptyBody}
            cta={{ href: getCatalogPath(locale), label: t.shop }}
          />
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link
                key={order.orderId}
                href={getOrderPath(locale, order.orderNumber)}
                className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 shadow-sm transition-colors hover:border-[var(--accent)] sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{order.orderNumber}</p>
                    <span className={statusBadge(order.customerPaymentStatus)}>
                      {statusLabel(order.customerPaymentStatus)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {formatAdminDate(order.updatedAt)}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                      <span className="font-semibold">{labels.digital}:</span>{' '}
                      {statusLabel(order.digitalFulfillmentStatus)}
                    </p>
                    <p>
                      <span className="font-semibold">{labels.physical}:</span>{' '}
                      {statusLabel(order.physicalFulfillmentStatus)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 sm:items-end">
                  <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {labels.total}
                  </span>
                  <strong className="text-lg">
                    {formatAdminMoney(order.amountMinor, order.currencyCode)}
                  </strong>
                  <span className="text-sm font-semibold text-[var(--accent)]">{labels.open}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
