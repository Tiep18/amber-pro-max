import Link from 'next/link';

import { AdminMetricCard, AdminPageHeader, AdminStatusPill } from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatShippingAddressLines } from '@/checkout/shipping-address';
import { EntitlementActions } from '@/components/admin/fulfillment/entitlement-actions';
import { EntitlementAuditList } from '@/components/admin/fulfillment/entitlement-audit-list';
import { FailedEmailQueue } from '@/components/admin/fulfillment/failed-email-queue';
import { PhysicalFulfillmentForm } from '@/components/admin/fulfillment/physical-fulfillment-form';
import type { AdminOrderDetail } from '@/payments/queries';
import { formatAdminDate, formatAdminMoney, statusLabel } from './format';
import { PaymentTimeline } from './payment-timeline';
import { ProviderEvidencePanel } from './provider-evidence-panel';
import { VietQrEvidenceForm } from './vietqr-evidence-form';

export function OrderDetail({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="grid gap-6">
      <Link href="/admin/orders" className="text-sm font-semibold text-[var(--accent)]">
        Back to order queue
      </Link>
      <AdminPageHeader
        eyebrow="Admin order detail"
        title={`Order ${order.orderNumber}`}
        description="Review payment evidence, fulfillment gate state, delivery work, and audit history."
      />
      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Payment"
          value={statusLabel(order.paymentStatus)}
          description={order.provider}
        />
        <AdminMetricCard
          label="Total"
          value={formatAdminMoney(order.amountMinor, order.currencyCode)}
          description={order.currencyCode}
        />
        <AdminMetricCard
          label="Paid gate"
          value={statusLabel(order.fulfillmentGateStatus)}
          description="digital release guard"
        />
        <AdminMetricCard
          label="Physical"
          value={statusLabel(order.physicalFulfillmentStatus)}
          description="manual fulfillment"
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Payment and fulfillment state</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Payment state</dt>
              <dd>
                <AdminStatusPill>{statusLabel(order.paymentStatus)}</AdminStatusPill>
              </dd>
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
              <dd>
                <AdminStatusPill>{statusLabel(order.fulfillmentGateStatus)}</AdminStatusPill>
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Digital fulfillment</dt>
              <dd>
                <AdminStatusPill>{statusLabel(order.digitalFulfillmentStatus)}</AdminStatusPill>
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Physical fulfillment</dt>
              <dd>
                <AdminStatusPill>{statusLabel(order.physicalFulfillmentStatus)}</AdminStatusPill>
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Reservation</dt>
              <dd>{formatAdminDate(order.reservationExpiresAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Refund</dt>
              <dd>
                {statusLabel(order.refundStatus)} (
                {formatAdminMoney(order.refundedAmountMinor, order.currencyCode)})
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
      <PhysicalFulfillmentForm order={order} />
      <EntitlementActions orderId={order.orderId} entitlements={order.digitalEntitlements} />
      <EntitlementAuditList items={order.entitlementAudit} />
      <FailedEmailQueue emails={order.failedEmails} />
      <VietQrEvidenceForm order={order} />
      <PaymentTimeline items={order.timeline} />
    </div>
  );
}
