import {CheckCircle2, Clock3, Package} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

type TrackInput = {
  digitalStatus: string;
  physicalStatus: string;
};

export type FulfillmentTrackLabels = {
  title: string;
  digital: string;
  physical: string;
  digitalReady: string;
  digitalLocked: string;
  physicalAwaiting: string;
  physicalPacking: string;
  physicalShipped: string;
  physicalDelivered: string;
};

export function getFulfillmentTrackLabels(input: TrackInput) {
  const digital = input.digitalStatus === 'eligible' || input.digitalStatus === 'active' || input.digitalStatus === 'ready' ? 'ready' : 'locked';
  const physical = input.physicalStatus === 'delivered' || input.physicalStatus === 'shipped' || input.physicalStatus === 'packing' ? input.physicalStatus : 'awaiting';
  return {digital, physical};
}

function physicalCopy(status: string, labels: FulfillmentTrackLabels) {
  if (status === 'delivered') return labels.physicalDelivered;
  if (status === 'shipped') return labels.physicalShipped;
  if (status === 'packing') return labels.physicalPacking;
  return labels.physicalAwaiting;
}

export function FulfillmentTrackSummary({digitalStatus, physicalStatus, labels}: TrackInput & {labels: FulfillmentTrackLabels}) {
  const tracks = getFulfillmentTrackLabels({digitalStatus, physicalStatus});
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase text-[var(--muted-foreground)]">
              {tracks.digital === 'ready' ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}
              {labels.digital}
            </p>
            <p className="mt-2 font-semibold">{tracks.digital === 'ready' ? labels.digitalReady : labels.digitalLocked}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase text-[var(--muted-foreground)]">
              <Package aria-hidden="true" className="size-4" />
              {labels.physical}
            </p>
            <p className="mt-2 font-semibold">{physicalCopy(tracks.physical, labels)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
