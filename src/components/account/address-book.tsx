'use client';

import {useActionState, useState} from 'react';
import {CheckCircle2, Home, MapPin, Pencil, Plus, Star, Trash2} from 'lucide-react';
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
    body: 'Save a delivery address to make future checkout faster.',
    eyebrow: 'Saved delivery details'
  },
  vi: {
    title: 'Chua co dia chi da luu',
    body: 'Luu dia chi giao hang de thanh toan nhanh hon lan sau.',
    eyebrow: 'Thong tin giao hang da luu'
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
    <section className="grid gap-5">
      <header className="grid gap-4 border-b border-[var(--border)] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid max-w-2xl gap-2">
          <p className="text-xs font-semibold text-[var(--accent)]">{empty.eyebrow}</p>
          <h1 className="text-[30px] font-semibold leading-tight text-[var(--foreground)] sm:text-[34px]">
            {labels.title}
          </h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{labels.intro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[var(--foreground)]">
            {addressCountLabel(addresses, locale)}
          </span>
          {hasAddresses ? (
            <Button onClick={openNewForm} className="min-h-9 w-full gap-2 px-3 text-sm sm:w-auto">
              <Plus className="size-4" aria-hidden="true" />
              {labels.newAddress}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4">
        {savedNotice ? (
          <p role="status" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-semibold text-[var(--success)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {labels.saved}
          </p>
        ) : null}
        {deleteState.status === 'deleted' ? (
          <p role="status" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-semibold text-[var(--success)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {labels.deleted}
          </p>
        ) : null}
        {defaultState.status === 'default_set' ? (
          <p role="status" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-semibold text-[var(--success)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
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
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_18px_45px_rgba(91,55,35,0.06)] sm:p-5">
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
          <div className="grid gap-3">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)] sm:p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
                        {address.isDefault ? <Star className="h-4 w-4" aria-hidden="true" /> : <Home className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <h2 className="text-base font-semibold leading-tight">{address.label}</h2>
                      {address.isDefault ? (
                        <span className="rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
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
                      className="min-h-10 gap-2 px-3 text-sm"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {labels.edit}
                    </Button>
                    {!address.isDefault ? (
                      <form action={defaultAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="addressId" value={address.id} />
                        <Button type="submit" variant="ghost" disabled={settingDefault} className="min-h-10 gap-2 px-3 text-sm">
                          <Star className="h-4 w-4" aria-hidden="true" />
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
                        className="min-h-10 gap-2 px-3 text-sm text-[var(--destructive)] hover:bg-[var(--surface-muted)]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
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
