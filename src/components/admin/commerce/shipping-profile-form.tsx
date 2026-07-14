'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveShippingProfileAction,
  type ShippingAdminActionResult
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ShippingProfileDraft = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

function FieldError({ children }: { children?: string }) {
  return children ? (
    <span role="alert" className="text-sm font-medium text-[var(--destructive)]">
      {children}
    </span>
  ) : null;
}

export function ShippingProfileForm({
  profile,
  onSaved,
  onDirtyChange
}: {
  profile?: ShippingProfileDraft;
  onSaved?: (profileId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ShippingAdminActionResult | null>(null);
  const [nameError, setNameError] = useState<string>();
  const [active, setActive] = useState(profile?.active ?? true);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(profile);

  function markDirty() {
    onDirtyChange?.(true);
    setResult(null);
  }

  return (
    <form
      className="grid gap-5"
      noValidate
      onChange={markDirty}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const name = String(formData.get('name') ?? '').trim();
        if (!name) {
          setNameError('Enter a package type name.');
          nameRef.current?.focus();
          return;
        }
        setNameError(undefined);
        startTransition(async () => {
          const actionResult = await saveShippingProfileAction({
            profileId: profile?.id,
            name,
            description: String(formData.get('description') ?? ''),
            active
          });
          setResult(actionResult);
          if (actionResult.status === 'saved' || actionResult.status === 'updated') {
            onDirtyChange?.(false);
            router.refresh();
            onSaved?.(actionResult.status === 'saved' ? actionResult.id : profile!.id);
          }
        });
      }}
    >
      {result?.status === 'invalid' ? (
        <Alert variant="destructive">Review the highlighted package fields.</Alert>
      ) : null}
      {result?.status === 'error' ? (
        <Alert variant="destructive">Package type could not be saved. Try again.</Alert>
      ) : null}

      <label className="grid gap-1.5">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          Package type name
          <span className="text-xs font-normal text-[var(--muted-foreground)]">Required</span>
        </span>
        <Input
          ref={nameRef}
          name="name"
          defaultValue={profile?.name ?? ''}
          autoComplete="off"
          maxLength={120}
          aria-invalid={Boolean(nameError)}
          className={cn(nameError && 'border-[var(--destructive)]')}
          onChange={() => {
            setNameError(undefined);
            markDirty();
          }}
          placeholder="Small parcel…"
        />
        <FieldError>{nameError}</FieldError>
      </label>

      <label className="grid gap-1.5">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          Internal description
          <span className="text-xs font-normal text-[var(--muted-foreground)]">Optional</span>
        </span>
        <Textarea
          name="description"
          defaultValue={profile?.description ?? ''}
          maxLength={500}
          rows={3}
          placeholder="Which products and parcel size this package type is for…"
        />
      </label>

      {editing ? (
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Availability</span>
          <Select
            value={active ? 'active' : 'inactive'}
            onValueChange={(value) => {
              setActive(value === 'active');
              markDirty();
            }}
          >
            <SelectTrigger aria-label="Package type availability">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active at checkout</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-[var(--muted-foreground)]">
            Inactive package types remain visible to admin but cannot resolve a checkout quote.
          </p>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving package type…' : editing ? 'Save package type' : 'Create package type'}
      </Button>
    </form>
  );
}
