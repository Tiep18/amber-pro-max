import Link from 'next/link';
import { ArrowRight, MailWarning, PackageCheck, WalletCards } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminOrderQueueItem } from '@/payments/queries';
import { formatAdminDate, formatAdminMoney, statusLabel } from './format';

function statusPill(label: string, tone: 'default' | 'warning' = 'default') {
  return (
    <span
      className={
        tone === 'warning'
          ? 'inline-flex items-center rounded-full bg-[var(--warning-surface)] px-3 py-1 text-xs font-semibold text-[var(--warning)]'
          : 'inline-flex items-center rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]'
      }
    >
      {label}
    </span>
  );
}

export function OrderQueue({ orders }: { orders: AdminOrderQueueItem[] }) {
  const pendingReview = orders.filter((order) =>
    ['pending', 'verifying', 'review_required'].includes(order.paymentStatus)
  ).length;
  const failedEmails = orders.reduce((total, order) => total + order.failedEmailCount, 0);

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="m-0 border-b border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Orders and payments</CardTitle>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Payment operations queue with method, deadline, fulfillment gate, and email recovery
              state.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <span className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm">
              <span className="block font-semibold tabular-nums">{pendingReview}</span>
              <span className="text-[var(--muted-foreground)]">need review</span>
            </span>
            <span className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm">
              <span className="block font-semibold tabular-nums">{failedEmails}</span>
              <span className="text-[var(--muted-foreground)]">failed emails</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <PackageCheck className="size-10 text-[var(--success)]" aria-hidden="true" />
            <p className="font-semibold">No payment orders need review.</p>
            <p className="max-w-md text-sm text-[var(--muted-foreground)]">
              New VietQR and PayPal work will appear here when it needs admin attention.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Evidence and customer payment trail
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <WalletCards className="size-4 text-[var(--accent)]" aria-hidden="true" />
                        <span className="font-semibold">{statusLabel(order.paymentStatus)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {order.provider}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold">
                        {formatAdminMoney(order.amountMinor, order.currencyCode)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Reserve until {formatAdminDate(order.reservationExpiresAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {statusPill(statusLabel(order.fulfillmentGateStatus))}
                        {statusPill(statusLabel(order.physicalFulfillmentStatus))}
                        {order.failedEmailCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-surface)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                            <MailWarning className="size-3" aria-hidden="true" />
                            {order.failedEmailCount} email
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Review
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
