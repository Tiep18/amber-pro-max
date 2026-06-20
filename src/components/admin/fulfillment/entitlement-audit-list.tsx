import type {AdminEntitlementAuditItem} from '@/payments/queries';
import {formatAdminDate, statusLabel} from '@/components/admin/orders/format';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export function EntitlementAuditList({items}: {items: AdminEntitlementAuditItem[]}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital entitlement audit</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Append-only digital access events. Sensitive token and storage details are not shown.</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No entitlement audit events yet.</p>
        ) : (
          <ol className="grid gap-3">
            {items.map((item, index) => (
              <li key={`${item.eventType}-${item.createdAt ?? index}`} className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{statusLabel(item.eventType)}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.actorType ?? 'system'} action</p>
                  </div>
                  <time className="text-sm text-[var(--muted-foreground)]">{formatAdminDate(item.createdAt)}</time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
