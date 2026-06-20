import Link from 'next/link';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {AdminOrderQueueItem} from '@/payments/queries';
import {formatAdminDate, formatAdminMoney, statusLabel} from './format';

export function OrderQueue({orders}: {orders: AdminOrderQueueItem[]}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders and payments</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Payment operations queue with method, deadline, gate, and review state.</p>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">No payment orders need review.</p>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Link
                key={order.orderId}
                href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)] sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">Order</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">View order payment evidence</p>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">Payment</p>
                  <p>{statusLabel(order.paymentStatus)}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{order.provider}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">Total</p>
                  <p>{formatAdminMoney(order.amountMinor, order.currencyCode)}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{formatAdminDate(order.reservationExpiresAt)}</p>
                </div>
                <div className="flex min-h-11 items-center">
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold">{statusLabel(order.fulfillmentGateStatus)}</span>
                  <span className="ml-2 rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold">{statusLabel(order.physicalFulfillmentStatus)}</span>
                  {order.failedEmailCount > 0 ? (
                    <span className="ml-2 rounded-full bg-[var(--warning-surface)] px-3 py-1 text-sm font-semibold text-[var(--warning)]">
                      {order.failedEmailCount} email
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
