'use client';

import { useActionState } from 'react';
import { RotateCcw, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  reissueDigitalEntitlementAction,
  revokeDigitalEntitlementAction
} from '@/fulfillment/admin-entitlement-actions';
import type { EntitlementActionResult } from '@/fulfillment/entitlements';
import { Button } from '@/components/ui/button';

type EntitlementState = EntitlementActionResult | { status: 'idle' };
const initialState: EntitlementState = { status: 'idle' };

function notifyEntitlementResult(result: EntitlementActionResult) {
  if (result.status === 'revoked') toast.success('Digital entitlement revoked.');
  else if (result.status === 'reissued') toast.success('Digital entitlement reissued.');
  else if (result.status === 'stale')
    toast.warning('Entitlement state changed. Refresh and try again.');
  else if (result.status === 'not_found') toast.error('Digital entitlement no longer exists.');
  else if (result.status === 'forbidden') toast.error('Admin authorization is required.');
  else if (result.status === 'invalid') toast.error('Review the entitlement action fields.');
  else toast.error('The entitlement action could not be completed.');
}

async function revokeAction(_: EntitlementState, formData: FormData): Promise<EntitlementState> {
  const result = await revokeDigitalEntitlementAction(formData);
  notifyEntitlementResult(result);
  return result;
}

async function reissueAction(_: EntitlementState, formData: FormData): Promise<EntitlementState> {
  const result = await reissueDigitalEntitlementAction(formData);
  notifyEntitlementResult(result);
  return result;
}

export function EntitlementActionControl({
  orderId,
  entitlementId,
  expectedVersion,
  active
}: {
  orderId: string;
  entitlementId: string;
  expectedVersion: number;
  active: boolean;
}) {
  const action = active ? revokeAction : reissueAction;
  const [, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-3"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="entitlementId" value={entitlementId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      {active ? (
        <input
          type="text"
          name="reason"
          placeholder="Reason"
          className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        />
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input required type="checkbox" name="confirm" value="yes" />
        Confirm {active ? 'revoke' : 'reissue'} access
      </label>
      <Button
        type="submit"
        variant={active ? 'destructive' : 'primary'}
        className="gap-2"
        disabled={pending}
      >
        {active ? (
          <ShieldOff aria-hidden="true" className="size-4" />
        ) : (
          <RotateCcw aria-hidden="true" className="size-4" />
        )}
        {pending
          ? active
            ? 'Revoking…'
            : 'Reissuing…'
          : active
            ? 'Revoke access'
            : 'Reissue access'}
      </Button>
    </form>
  );
}
