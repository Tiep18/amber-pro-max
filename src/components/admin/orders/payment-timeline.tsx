import {History, ShieldCheck} from 'lucide-react';

import type {AdminOrderTimelineItem} from '@/payments/queries';
import {formatAdminDate, statusLabel} from './format';

function summarizeFacts(facts: unknown) {
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
    return 'No sanitized facts recorded';
  }
  const record = facts as Record<string, unknown>;
  const allowed = ['providerEventId', 'providerOrderId', 'providerCaptureId', 'amountMinor', 'currencyCode', 'receiverMerchantId', 'status', 'digest'];
  return allowed
    .filter((key) => record[key] !== undefined)
    .map((key) => `${statusLabel(key)}: ${String(record[key])}`)
    .join(' | ') || 'Sanitized payment facts recorded';
}

export function PaymentTimeline({items}: {items: AdminOrderTimelineItem[]}) {
  return (
    <section aria-labelledby="payment-timeline-heading" className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        <h2 id="payment-timeline-heading" className="text-xl font-semibold">
          Payment timeline
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">No audit events recorded yet.</p>
      ) : (
        <ol aria-label="Payment timeline" className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.eventType}-${item.createdAt ?? index}`} className="grid gap-2 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                <span className="font-semibold">{statusLabel(item.eventType)}</span>
                <span className="text-sm text-[var(--muted-foreground)]">{formatAdminDate(item.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Source {item.source ?? 'system'} | Actor {item.actorType ?? 'system'} | Transition {item.paymentTransitionId ?? 'none'}
              </p>
              <p className="break-words text-sm">{summarizeFacts(item.sanitizedFacts)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
