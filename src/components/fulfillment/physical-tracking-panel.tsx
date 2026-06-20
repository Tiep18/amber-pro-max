import {ExternalLink, Truck} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

type PhysicalTracking = {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export type PhysicalTrackingLabels = {
  title: string;
  awaiting: string;
  packing: string;
  shippedNoTracking: string;
  shippedTracking: string;
  delivered: string;
  carrier: string;
  trackingNumber: string;
  openTracking: string;
};

export function safeTrackingHref(value: string | null | undefined) {
  if (!value?.startsWith('https://')) {
    return null;
  }
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function statusCopy(status: string, hasTracking: boolean, labels: PhysicalTrackingLabels) {
  if (status === 'delivered') return labels.delivered;
  if (status === 'shipped') return hasTracking ? labels.shippedTracking : labels.shippedNoTracking;
  if (status === 'packing') return labels.packing;
  return labels.awaiting;
}

export function PhysicalTrackingPanel({tracking, labels}: {tracking: PhysicalTracking | null; labels: PhysicalTrackingLabels}) {
  const current = tracking;
  const href = safeTrackingHref(current?.trackingUrl);
  const carrier = current?.carrier ?? null;
  const trackingNumber = current?.trackingNumber ?? null;
  const hasTracking = Boolean(trackingNumber || href);
  const status = current?.status ?? 'awaiting_fulfillment';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="flex items-start gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
          <Truck aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <span>{statusCopy(status, hasTracking, labels)}</span>
        </p>
        {carrier || trackingNumber || href ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {carrier ? (
              <div>
                <dt className="font-semibold">{labels.carrier}</dt>
                <dd className="break-words">{carrier}</dd>
              </div>
            ) : null}
            {trackingNumber ? (
              <div>
                <dt className="font-semibold">{labels.trackingNumber}</dt>
                <dd className="break-words">{trackingNumber}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 font-semibold">
            <ExternalLink aria-hidden="true" className="size-4" />
            {labels.openTracking}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
