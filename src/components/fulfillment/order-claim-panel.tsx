import {CheckCircle2, Link2} from 'lucide-react';
import {claimGuestOrderAction} from '@/fulfillment/order-claim';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export type OrderClaimLabels = {
  title: string;
  intro: string;
  submit: string;
  signedInOnly: string;
  genericDenied: string;
};

export function OrderClaimPanel({locale, orderNumber, token, labels}: {locale: Locale; orderNumber: string; token: string; labels: OrderClaimLabels}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.intro}</p>
      </CardHeader>
      <CardContent>
        {token ? (
          <form action={claimGuestOrderAction as unknown as (formData: FormData) => Promise<void>} className="grid max-w-[420px] gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="orderNumber" value={orderNumber} />
            <input type="hidden" name="token" value={token} />
            <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Link2 aria-hidden="true" className="size-4" />
              {labels.signedInOnly}
            </p>
            <Button type="submit" className="gap-2">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {labels.submit}
            </Button>
          </form>
        ) : (
          <p role="alert" className="text-sm text-[var(--muted-foreground)]">{labels.genericDenied}</p>
        )}
      </CardContent>
    </Card>
  );
}
