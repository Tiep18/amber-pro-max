import type { AdminOrderDetail } from '@/payments/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhysicalFulfillmentActionForm } from './physical-fulfillment-action-form';

export function PhysicalFulfillmentForm({ order }: { order: AdminOrderDetail }) {
  const physical = order.physicalFulfillment;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical fulfillment</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manual status and tracking updates for handmade goods. Shipping email is queued when
          status becomes shipped.
        </p>
      </CardHeader>
      <CardContent>
        {physical ? (
          <PhysicalFulfillmentActionForm
            orderId={order.orderId}
            orderNumber={order.orderNumber}
            recipientEmail={order.contactEmail}
            physical={physical}
          />
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No physical fulfillment row exists for this order.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
