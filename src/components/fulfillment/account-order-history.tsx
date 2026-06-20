import Link from 'next/link';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {formatAdminDate, formatAdminMoney, statusLabel} from '@/components/admin/orders/format';
import {getOrderPath, type Locale} from '@/i18n/routing';
import type {CustomerOrderHistoryItem} from '@/fulfillment/account-queries';

type Labels = {
  title: string;
  empty: string;
  total: string;
  payment: string;
  digital: string;
  physical: string;
  open: string;
};

export function AccountOrderHistory({orders, locale, labels}: {orders: CustomerOrderHistoryItem[]; locale: Locale; labels: Labels}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{labels.empty}</p>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Link key={order.orderId} href={getOrderPath(locale, order.orderNumber)} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)] sm:grid-cols-[1fr_0.8fr_0.8fr]">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{formatAdminDate(order.updatedAt)}</p>
                </div>
                <div className="text-sm">
                  <p><span className="font-semibold">{labels.payment}:</span> {statusLabel(order.paymentStatus)}</p>
                  <p><span className="font-semibold">{labels.total}:</span> {formatAdminMoney(order.amountMinor, order.currencyCode)}</p>
                </div>
                <div className="text-sm">
                  <p><span className="font-semibold">{labels.digital}:</span> {statusLabel(order.digitalFulfillmentStatus)}</p>
                  <p><span className="font-semibold">{labels.physical}:</span> {statusLabel(order.physicalFulfillmentStatus)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
