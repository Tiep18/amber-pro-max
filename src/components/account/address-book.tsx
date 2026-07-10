'use client';

import {useActionState, useState} from 'react';
import {MapPin, Plus} from 'lucide-react';
import {
  deleteCustomerShippingAddressAction,
  setDefaultCustomerShippingAddressAction,
  type AddressActionState
} from '@/account/address-actions';
import type {CustomerShippingAddress} from '@/account/addresses';
import {AddressForm, type AddressFormLabels} from '@/components/account/address-form';
import {AccountEmptyState} from '@/components/account/account-empty-state';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';

type AddressBookLabels = AddressFormLabels & {
  title: string;
  intro: string;
  empty: string;
  newAddress: string;
  defaultBadge: string;
  edit: string;
  delete: string;
  deleting: string;
  setDefault: string;
  settingDefault: string;
  deleted: string;
  defaultSet: string;
  deleteConfirm: string;
};

const initialState: AddressActionState = { status: 'idle' };

const emptyCopy = {
  en: {
    title: 'No saved addresses yet',
    body: 'Save a delivery address to make future checkout faster.'
  },
  vi: {
    title: 'Chua co dia chi da luu',
    body: 'Luu dia chi giao hang de thanh toan nhanh hon lan sau.'
  }
} as const;

function addressCountLabel(addresses: CustomerShippingAddress[], locale: Locale) {
  if (locale === 'vi') return `${addresses.length} dia chi`;
  return `${addresses.length} ${addresses.length === 1 ? 'address' : 'addresses'}`;
}

function locationLines(address: CustomerShippingAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.locality, address.region, address.postalCode].filter(Boolean).join(', '),
    address.countryCode
  ].filter((line): line is string => Boolean(line));
}

export function AddressBook({
  addresses,
  locale,
  labels
}: {
  addresses: CustomerShippingAddress[];
  locale: Locale;
  labels: AddressBookLabels;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(addresses.length === 0);
  const [savedNotice, setSavedNotice] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteCustomerShippingAddressAction,
    initialState
  );
  const [defaultState, defaultAction, settingDefault] = useActionState(
    setDefaultCustomerShippingAddressAction,
    initialState
  );
  const empty = emptyCopy[locale];
  const hasAddresses = addresses.length > 0;

  function openNewForm() {
    setEditingId(null);
    setSavedNotice(false);
    setShowNewForm(true);
  }

  function openEditForm(addressId: string) {
    setSavedNotice(false);
    setShowNewForm(false);
    setEditingId((current) => (current === addressId ? null : addressId));
  }

  function handleSaved() {
    setSavedNotice(true);
    setEditingId(null);
    setShowNewForm(false);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {addressCountLabel(addresses, locale)}
          </p>
          <h1 className="text-2xl font-semibold leading-tight text-[var(--foreground)]">
            {labels.title}
          </h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{labels.intro}</p>
        </div>
        {hasAddresses ? (
          <Button onClick={openNewForm} className="w-full gap-2 sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            {labels.newAddress}
          </Button>
        ) : null}
      </header>

      <div className="space-y-4">
        {savedNotice ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.saved}
          </p>
        ) : null}
        {deleteState.status === 'deleted' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.deleted}
          </p>
        ) : null}
        {defaultState.status === 'default_set' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.defaultSet}
          </p>
        ) : null}
        {deleteState.status === 'error' ||
        deleteState.status === 'invalid' ||
        deleteState.status === 'not_found' ||
        defaultState.status === 'error' ||
        defaultState.status === 'invalid' ||
        defaultState.status === 'not_found' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.error}
          </p>
        ) : null}

        {showNewForm ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{labels.newAddress}</h2>
              {hasAddresses ? (
                <Button variant="ghost" onClick={() => setShowNewForm(false)} className="min-h-9 px-3 text-sm">
                  {labels.cancel}
                </Button>
              ) : null}
            </div>
            <AddressForm locale={locale} labels={labels} onSaved={handleSaved} />
          </div>
        ) : null}

        {!hasAddresses ? (
          <div className="space-y-4">
            <AccountEmptyState
              icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
              title={empty.title}
              body={labels.empty || empty.body}
            />
            {!showNewForm ? (
              <Button onClick={openNewForm} className="w-full gap-2 sm:w-auto">
                <Plus className="size-4" aria-hidden="true" />
                {labels.newAddress}
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasAddresses ? (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="border-b border-[var(--border)] p-4 last:border-b-0 sm:p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-semibold leading-tight">{address.label}</h2>
                      {address.isDefault ? (
                        <span className="rounded-full border border-[var(--success)] bg-[var(--success-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                          {labels.defaultBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {address.recipientName}
                      <span className="mx-2 text-[var(--muted-foreground)]">/</span>
                      {address.phoneNumber}
                    </p>
                    <address className="not-italic text-sm leading-6 text-[var(--muted-foreground)]">
                      {locationLines(address).map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => openEditForm(address.id)}
                      className="min-h-10 px-3 text-sm"
                    >
                      {labels.edit}
                    </Button>
                    {!address.isDefault ? (
                      <form action={defaultAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="addressId" value={address.id} />
                        <Button type="submit" variant="ghost" disabled={settingDefault} className="min-h-10 px-3 text-sm">
                          {settingDefault ? labels.settingDefault : labels.setDefault}
                        </Button>
                      </form>
                    ) : null}
                    <form
                      action={deleteAction}
                      onSubmit={(event) => {
                        if (!window.confirm(labels.deleteConfirm)) event.preventDefault();
                      }}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="addressId" value={address.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        disabled={deleting}
                        className="min-h-10 px-3 text-sm text-[var(--destructive)] hover:bg-[var(--surface-muted)]"
                      >
                        {deleting ? labels.deleting : labels.delete}
                      </Button>
                    </form>
                  </div>
                </div>
                {editingId === address.id ? (
                  <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
                    <AddressForm
                      locale={locale}
                      labels={labels}
                      address={address}
                      onCancel={() => setEditingId(null)}
                      onSaved={handleSaved}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
