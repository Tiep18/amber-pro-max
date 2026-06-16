import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {AdminOrderDetail} from '@/payments/queries';

export function ProviderEvidencePanel({order}: {order: AdminOrderDetail}) {
  const latest = order.timeline.find((item) => item.source?.includes('paypal') || item.source?.includes('vietqr'));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider evidence</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">Sanitized operational facts only. Sensitive payloads and signatures are not displayed.</p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Provider</dt>
            <dd className="text-[var(--muted-foreground)]">{order.provider}</dd>
          </div>
          <div>
            <dt className="font-semibold">Payment state</dt>
            <dd className="text-[var(--muted-foreground)]">{order.paymentStatus}</dd>
          </div>
          <div>
            <dt className="font-semibold">Review reason</dt>
            <dd className="text-[var(--muted-foreground)]">{order.reviewReason ?? 'None'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Latest evidence source</dt>
            <dd className="text-[var(--muted-foreground)]">{latest?.source ?? 'None recorded'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
