'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createShippingProfileAction, type CreateShippingProfileResult} from '@/checkout/admin-shipping-actions';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

export function ShippingProfileForm() {
  const router = useRouter();
  const [result, setResult] = useState<CreateShippingProfileResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const actionResult = await createShippingProfileAction(formData);
          setResult(actionResult);
          if (actionResult.status === 'created') {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      {result?.status === 'created' ? <Alert variant="success">Shipping profile created.</Alert> : null}
      {result?.status === 'invalid' ? <Alert variant="destructive">Check the shipping profile fields.</Alert> : null}
      {result?.status === 'error' ? <Alert variant="destructive">Shipping profile could not be created.</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">Profile name</span>
        <input name="name" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">Description</span>
        <textarea name="description" className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Country code</span>
          <input name="countryCode" maxLength={2} className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase" />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Currency</span>
          <select name="currencyCode" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3">
            <option value="USD">USD</option>
            <option value="VND">VND</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">First item fee</span>
          <input name="firstItemFee" inputMode="decimal" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Additional item fee</span>
          <input name="additionalItemFee" inputMode="decimal" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
        </label>
      </div>
      <Button type="submit" disabled={pending}>Create shipping profile</Button>
    </form>
  );
}
