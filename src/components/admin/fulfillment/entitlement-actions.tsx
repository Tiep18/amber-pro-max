import {KeyRound, RotateCcw, ShieldOff} from 'lucide-react';

import {reissueDigitalEntitlementAction, revokeDigitalEntitlementAction} from '@/fulfillment/admin-entitlement-actions';
import type {AdminDigitalEntitlementItem} from '@/payments/queries';
import {formatAdminDate, statusLabel} from '@/components/admin/orders/format';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

function actionCopy(status: string) {
  return status === 'active'
    ? {
        heading: 'Active access',
        body: 'Customer download access is currently eligible. Revoke only when support or refund policy requires it.'
      }
    : {
        heading: 'Inactive access',
        body: 'Reissue creates fresh access and queues a new customer email through the transactional outbox.'
      };
}

export function EntitlementActions({orderId, entitlements}: {orderId: string; entitlements: AdminDigitalEntitlementItem[]}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital entitlement actions</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Revoke or reissue access with expected-version checks and audit events.</p>
      </CardHeader>
      <CardContent>
        {entitlements.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No digital entitlements for this order.</p>
        ) : (
          <div className="grid gap-3">
            {entitlements.map((entitlement) => {
              const copy = actionCopy(entitlement.status);
              return (
                <section key={entitlement.id} className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 lg:grid-cols-[1fr_auto]">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold uppercase text-[var(--muted-foreground)]">
                          <KeyRound aria-hidden="true" className="size-4" />
                          {copy.heading}
                        </p>
                        <h3 className="text-lg font-semibold">{statusLabel(entitlement.productId)}</h3>
                      </div>
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-sm font-semibold">{statusLabel(entitlement.status)}</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">{copy.body}</p>
                    <dl className="grid gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="font-semibold">Version</dt>
                        <dd>{entitlement.version}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Recipient</dt>
                        <dd>{entitlement.contactEmailMasked}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Granted</dt>
                        <dd>{formatAdminDate(entitlement.grantedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Updated</dt>
                        <dd>{formatAdminDate(entitlement.updatedAt)}</dd>
                      </div>
                    </dl>
                    {entitlement.revokeReason ? <p className="text-sm text-[var(--muted-foreground)]">Reason: {entitlement.revokeReason}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {entitlement.status === 'active' ? (
                      <form action={revokeDigitalEntitlementAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-3">
                        <input type="hidden" name="orderId" value={orderId} />
                        <input type="hidden" name="entitlementId" value={entitlement.id} />
                        <input type="hidden" name="expectedVersion" value={entitlement.version} />
                        <input type="text" name="reason" placeholder="Reason" className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
                        <label className="flex items-center gap-2 text-sm">
                          <input required type="checkbox" name="confirm" value="yes" />
                          Confirm revoke access
                        </label>
                        <Button type="submit" variant="destructive" className="gap-2">
                          <ShieldOff aria-hidden="true" className="size-4" />
                          Revoke access
                        </Button>
                      </form>
                    ) : (
                      <form action={reissueDigitalEntitlementAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] p-3">
                        <input type="hidden" name="orderId" value={orderId} />
                        <input type="hidden" name="entitlementId" value={entitlement.id} />
                        <input type="hidden" name="expectedVersion" value={entitlement.version} />
                        <label className="flex items-center gap-2 text-sm">
                          <input required type="checkbox" name="confirm" value="yes" />
                          Confirm reissue access
                        </label>
                        <Button type="submit" className="gap-2">
                          <RotateCcw aria-hidden="true" className="size-4" />
                          Reissue access
                        </Button>
                      </form>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
