import {Mail} from 'lucide-react';
import {requestGuestOrderClaimEmailAction, requestGuestOrderReopenAction} from '@/fulfillment/order-claim';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export type GuestReopenLabels = {
  title: string;
  intro: string;
  orderNumber: string;
  email: string;
  reopenSubmit: string;
  claimSubmit: string;
  genericSuccess: string;
};

export function GuestReopenForm({locale, labels}: {locale: Locale; labels: GuestReopenLabels}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.intro}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <form action={requestGuestOrderReopenAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="grid gap-1 text-sm font-semibold">
              {labels.orderNumber}
              <input name="orderNumber" required className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {labels.email}
              <input name="email" type="email" required className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
            </label>
            <Button type="submit" className="gap-2">
              <Mail aria-hidden="true" className="size-4" />
              {labels.reopenSubmit}
            </Button>
            <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
          </form>
          <form action={requestGuestOrderClaimEmailAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="grid gap-1 text-sm font-semibold">
              {labels.orderNumber}
              <input name="orderNumber" required className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {labels.email}
              <input name="email" type="email" required className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
            </label>
            <Button type="submit" variant="secondary" className="gap-2">
              <Mail aria-hidden="true" className="size-4" />
              {labels.claimSubmit}
            </Button>
            <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
