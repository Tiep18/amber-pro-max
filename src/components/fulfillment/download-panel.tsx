import {Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

type DownloadPanelLabels = {
  title: string;
  readyBody: string;
  lockedBody: string;
  expiredBody: string;
  action: string;
};

type DownloadPanelProps = {
  orderNumber: string;
  eligible: boolean;
  labels: DownloadPanelLabels;
};

export function DownloadPanel({orderNumber, eligible, labels}: DownloadPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{eligible ? labels.readyBody : labels.lockedBody}</p>
        {eligible ? (
          <form action={`/api/downloads?orderNumber=${encodeURIComponent(orderNumber)}`} method="post">
            <Button type="submit" className="gap-2">
              <Download aria-hidden="true" className="size-4" />
              {labels.action}
            </Button>
          </form>
        ) : (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{labels.expiredBody}</p>
        )}
      </CardContent>
    </Card>
  );
}
