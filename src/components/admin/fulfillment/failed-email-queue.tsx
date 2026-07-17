import type { AdminFailedEmailQueueItem } from '@/payments/queries';
import { formatAdminDate, statusLabel } from '@/components/admin/orders/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailRecoveryActions } from './email-recovery-actions';

export function FailedEmailQueue({ emails }: { emails: AdminFailedEmailQueueItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed email queue</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sanitized transactional email recovery. Sensitive provider details and tokens are not
          shown.
        </p>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No failed transactional emails for this order.
          </p>
        ) : (
          <div className="grid gap-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[1fr_auto]"
              >
                <div className="grid gap-2">
                  <div>
                    <p className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">
                      {statusLabel(email.eventType)}
                    </p>
                    <p className="font-semibold">{email.maskedRecipient}</p>
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold">Status</dt>
                      <dd>{statusLabel(email.status)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Next retry</dt>
                      <dd>{formatAdminDate(email.nextRetryAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Error</dt>
                      <dd>{email.sanitizedError}</dd>
                    </div>
                  </dl>
                </div>
                <EmailRecoveryActions
                  emailId={email.id}
                  orderId={email.orderId}
                  orderNumber={email.orderNumber}
                  entitlementId={email.entitlementId}
                  locale={email.locale}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
