'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveShippingProfileAction,
  type ShippingAdminActionResult
} from '@/checkout/admin-shipping-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ShippingProfileForm({ onCreated }: { onCreated?: (profileId: string) => void }) {
  const router = useRouter();
  const [result, setResult] = useState<ShippingAdminActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const actionResult = await saveShippingProfileAction({
            name: String(formData.get('name') ?? ''),
            description: String(formData.get('description') ?? ''),
            active: true
          });
          setResult(actionResult);
          if (actionResult.status === 'saved') {
            form.reset();
            router.refresh();
            onCreated?.(actionResult.id);
          }
        });
      }}
    >
      {result?.status === 'saved' ? (
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
      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? 'Creating profile...' : 'Create shipping profile'}
      </Button>
    </form>
  );
}
