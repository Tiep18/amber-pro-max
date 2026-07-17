'use client';

import { useActionState } from 'react';
import { PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { updatePhysicalFulfillmentServerAction } from '@/fulfillment/physical-server-actions';
import type { PhysicalFulfillmentResult } from '@/fulfillment/physical';
import { formatAdminDate, statusLabel } from '@/components/admin/orders/format';
import { Button } from '@/components/ui/button';

const statuses = ['awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'cancelled'] as const;

type PhysicalState = PhysicalFulfillmentResult | { status: 'idle' };
const initialState: PhysicalState = { status: 'idle' };

async function updateAction(_: PhysicalState, formData: FormData): Promise<PhysicalState> {
  const result = await updatePhysicalFulfillmentServerAction(formData);
  if (result.status === 'updated') toast.success('Physical fulfillment status updated.');
  else if (result.status === 'stale')
    toast.warning('Fulfillment state changed. Refresh and try again.');
  else if (result.status === 'invalid')
    toast.error('Review the fulfillment fields and transition.');
  else if (result.status === 'not_found') toast.error('Physical fulfillment no longer exists.');
  else toast.error('Physical fulfillment could not be updated.');
  return result;
}

export function PhysicalFulfillmentActionForm({
  orderId,
  orderNumber,
  recipientEmail,
  physical
}: {
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  physical: {
    status: string;
    version: number;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
}) {
  const [, formAction, pending] = useActionState(updateAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="expectedStatus" value={physical.status} />
      <input type="hidden" name="expectedVersion" value={physical.version} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="recipientEmail" value={recipientEmail} />
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
          <select
            name="status"
            defaultValue={physical.status}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Carrier
          <input
            name="carrier"
            defaultValue={physical.carrier ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tracking number
          <input
            name="trackingNumber"
            defaultValue={physical.trackingNumber ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tracking URL
          <input
            name="trackingUrl"
            type="url"
            placeholder="https://"
            defaultValue={physical.trackingUrl ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        Admin note
        <textarea
          name="note"
          rows={3}
          className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        />
      </label>
      <Button type="submit" className="w-fit gap-2" disabled={pending}>
        <PackageCheck aria-hidden="true" className="size-4" />
        {pending ? 'Updating physical status…' : 'Update physical status'}
      </Button>
    </form>
  );
}
