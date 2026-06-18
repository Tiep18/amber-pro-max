import Link from 'next/link';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {formatShippingAddressLines} from '@/checkout/shipping-address';
import type {AdminOrderDetail} from '@/payments/queries';
import {formatAdminDate, formatAdminMoney, statusLabel} from './format';
import {PaymentTimeline} from './payment-timeline';
import {ProviderEvidencePanel} from './provider-evidence-panel';
import {VietQrEvidenceForm} from './vietqr-evidence-form';

export function OrderDetail({order}: {order: AdminOrderDetail}) {
  return (
    <div className="grid gap-6">
      <Link href="/admin/orders" className="text-sm font-semibold text-[var(--accent)]">
        Back to order queue
      </Link>
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin order detail</p>
        <h1 className="text-3xl font-semibold">Order {order.orderNumber}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment and fulfillment state</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Payment state</dt>
              <dd>{statusLabel(order.paymentStatus)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Method</dt>
              <dd>{order.provider}</dd>
            </div>
            <div>
              <dt className="font-semibold">Total</dt>
              <dd>{formatAdminMoney(order.amountMinor, order.currencyCode)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Paid gate</dt>
              <dd>{statusLabel(order.fulfillmentGateStatus)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Digital fulfillment</dt>
              <dd>{statusLabel(order.digitalFulfillmentStatus)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Physical fulfillment</dt>
              <dd>{statusLabel(order.physicalFulfillmentStatus)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Reservation</dt>
              <dd>{formatAdminDate(order.reservationExpiresAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Refund</dt>
              <dd>
                {statusLabel(order.refundStatus)} ({formatAdminMoney(order.refundedAmountMinor, order.currencyCode)})
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {order.shippingAddress ? (
        <Card>
          <CardHeader>
            <CardTitle>Shipping address snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <address className="not-italic text-sm leading-6">
              {formatShippingAddressLines(order.shippingAddress).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </CardContent>
        </Card>
      ) : null}
      <ProviderEvidencePanel order={order} />
      <VietQrEvidenceForm order={order} />
      <PaymentTimeline items={order.timeline} />
    </div>
  );
}
