'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createShippingProfileAction,
  type CreateShippingProfileResult
} from '@/checkout/admin-shipping-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export function ShippingProfileForm({ onCreated }: { onCreated?: (profileId: string) => void }) {
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
            onCreated?.(actionResult.profileId);
          }
        });
      }}
    >
      {result?.status === 'created' ? (
        <Alert variant="success">Shipping profile created.</Alert>
      ) : null}
      {result?.status === 'invalid' ? (
        <Alert variant="destructive">Check the shipping profile fields.</Alert>
      ) : null}
      {result?.status === 'error' ? (
        <Alert variant="destructive">Shipping profile could not be created.</Alert>
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Profile name</span>
        <Input name="name" autoComplete="off" required />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Description</span>
        <textarea
          name="description"
          className="min-h-20 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base focus-visible:outline-none"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Country code</span>
          <Input name="countryCode" maxLength={2} placeholder="US" className="uppercase" required />
        </label>
        <div className="grid gap-2">
          <span className="text-sm font-semibold">Currency</span>
          <Select name="currencyCode" defaultValue="USD">
            <SelectTrigger aria-label="Currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="VND">VND</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">First item fee</span>
          <Input name="firstItemFee" inputMode="decimal" placeholder="0.00" required />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Additional item fee</span>
          <Input name="additionalItemFee" inputMode="decimal" placeholder="0.00" required />
        </label>
      </div>
      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? 'Creating profile...' : 'Create shipping profile'}
      </Button>
    </form>
  );
}
