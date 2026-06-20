'use client';

import {useActionState} from 'react';
import {
  createCustomerShippingAddressAction,
  updateCustomerShippingAddressAction,
  type AddressActionState
} from '@/account/address-actions';
import type {CustomerShippingAddress} from '@/account/addresses';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';

export type AddressFormLabels = {
  fields: {
    label: string;
    recipientName: string;
    phoneNumber: string;
    countryCode: string;
    region: string;
    locality: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    isDefault: string;
  };
  save: string;
  saving: string;
  cancel: string;
  saved: string;
  error: string;
};

const initialState: AddressActionState = {status: 'idle'};

function statusMessage(state: AddressActionState, labels: AddressFormLabels) {
  if (state.status === 'saved') return labels.saved;
  if (state.status === 'invalid' || state.status === 'not_found' || state.status === 'error') return labels.error;
  return null;
}

export function AddressForm({
  locale,
  labels,
  address,
  onCancel
}: {
  locale: Locale;
  labels: AddressFormLabels;
  address?: CustomerShippingAddress;
  onCancel?: () => void;
}) {
  const action = address ? updateCustomerShippingAddressAction : createCustomerShippingAddressAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = statusMessage(state, labels);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      {address ? <input type="hidden" name="addressId" value={address.id} /> : null}
      {message ? (
        <p role={state.status === 'saved' ? 'status' : 'alert'} className={state.status === 'saved' ? 'text-sm font-semibold text-[var(--success)]' : 'text-sm font-semibold text-[var(--destructive)]'}>
          {message}
        </p>
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm font-semibold">{labels.fields.label}</span>
        <input
          name="label"
          required
          maxLength={80}
          defaultValue={address?.label ?? ''}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.recipientName}</span>
          <input
            name="recipientName"
            required
            maxLength={120}
            autoComplete="name"
            defaultValue={address?.recipientName ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.phoneNumber}</span>
          <input
            name="phoneNumber"
            required
            minLength={5}
            maxLength={40}
            autoComplete="tel"
            defaultValue={address?.phoneNumber ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.countryCode}</span>
          <input
            name="countryCode"
            required
            minLength={2}
            maxLength={2}
            autoComplete="country"
            defaultValue={address?.countryCode ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.postalCode}</span>
          <input
            name="postalCode"
            maxLength={200}
            autoComplete="postal-code"
            defaultValue={address?.postalCode ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">{labels.fields.addressLine1}</span>
        <input
          name="addressLine1"
          required
          maxLength={200}
          autoComplete="address-line1"
          defaultValue={address?.addressLine1 ?? ''}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">{labels.fields.addressLine2}</span>
        <input
          name="addressLine2"
          maxLength={200}
          autoComplete="address-line2"
          defaultValue={address?.addressLine2 ?? ''}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.locality}</span>
          <input
            name="locality"
            maxLength={200}
            autoComplete="address-level2"
            defaultValue={address?.locality ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold">{labels.fields.region}</span>
          <input
            name="region"
            maxLength={200}
            autoComplete="address-level1"
            defaultValue={address?.region ?? ''}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input name="isDefault" type="checkbox" defaultChecked={address?.isDefault ?? false} className="size-5" />
        {labels.fields.isDefault}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? labels.saving : labels.save}</Button>
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>{labels.cancel}</Button> : null}
      </div>
    </form>
  );
}
