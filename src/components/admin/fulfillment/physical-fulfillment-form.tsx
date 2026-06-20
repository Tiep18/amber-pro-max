import {PackageCheck} from 'lucide-react';
import {updatePhysicalFulfillmentAction} from '@/fulfillment/physical';
import type {AdminOrderDetail} from '@/payments/queries';
import {formatAdminDate, statusLabel} from '@/components/admin/orders/format';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

const statuses = ['awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'cancelled'] as const;

export function PhysicalFulfillmentForm({order}: {order: AdminOrderDetail}) {
  const physical = order.physicalFulfillment;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical fulfillment</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Manual status and tracking updates for handmade goods. Shipping email is queued when status becomes shipped.</p>
      </CardHeader>
      <CardContent>
        {physical ? (
          <form action={updatePhysicalFulfillmentAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-4">
            <input type="hidden" name="orderId" value={order.orderId} />
            <input type="hidden" name="expectedStatus" value={physical.status} />
            <input type="hidden" name="expectedVersion" value={physical.version} />
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <input type="hidden" name="recipientEmail" value={order.contactEmail} />
            <input type="hidden" name="locale" value="en" />
            <dl className="grid gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="font-semibold">Current status</dt>
                <dd>{statusLabel(physical.status)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Version</dt>
                <dd>{physical.version}</dd>
              </div>
              <div>
                <dt className="font-semibold">Shipped</dt>
                <dd>{formatAdminDate(physical.shippedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Delivered</dt>
                <dd>{formatAdminDate(physical.deliveredAt)}</dd>
              </div>
            </dl>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Status
                <select name="status" defaultValue={physical.status} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3">
                  {statuses.map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Carrier
                <input name="carrier" defaultValue={physical.carrier ?? ''} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Tracking number
                <input name="trackingNumber" defaultValue={physical.trackingNumber ?? ''} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Tracking URL
                <input name="trackingUrl" type="url" placeholder="https://" defaultValue={physical.trackingUrl ?? ''} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              Admin note
              <textarea name="note" rows={3} className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2" />
            </label>
            <Button type="submit" className="w-fit gap-2">
              <PackageCheck aria-hidden="true" className="size-4" />
              Update physical status
            </Button>
          </form>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">No physical fulfillment row exists for this order.</p>
        )}
      </CardContent>
    </Card>
  );
}
