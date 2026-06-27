'use client';

import { useActionState, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  deleteCustomerShippingAddressAction,
  setDefaultCustomerShippingAddressAction,
  type AddressActionState
} from '@/account/address-actions';
import type { CustomerShippingAddress } from '@/account/addresses';
import { formatShippingAddressLines } from '@/checkout/shipping-address';
import { AddressForm, type AddressFormLabels } from '@/components/account/address-form';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Locale } from '@/i18n/routing';

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
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteCustomerShippingAddressAction,
    initialState
  );
  const [defaultState, defaultAction, settingDefault] = useActionState(
    setDefaultCustomerShippingAddressAction,
    initialState
  );
  const empty = emptyCopy[locale];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">{labels.intro}</p>
        </div>
        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
          {addresses.length}{' '}
          {locale === 'vi' ? 'dia chi' : addresses.length === 1 ? 'address' : 'addresses'}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {addresses.length === 0 ? (
          <AccountEmptyState
            icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
            title={empty.title}
            body={labels.empty || empty.body}
          />
        ) : (
          <div className="grid gap-3">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="min-h-[88px] rounded-[var(--radius-control)] border border-[var(--border)] p-4 shadow-sm sm:min-h-[72px]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{address.label}</h3>
                      {address.isDefault ? (
                        <span className="rounded-full border border-[var(--success)] bg-[var(--success-surface)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
                          {labels.defaultBadge}
                        </span>
                      ) : null}
                    </div>
                    <address className="mt-2 not-italic text-sm leading-6 text-[var(--muted-foreground)]">
                      {formatShippingAddressLines(address).map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingId(editingId === address.id ? null : address.id)}
                    >
                      {labels.edit}
                    </Button>
                    {!address.isDefault ? (
                      <form action={defaultAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="addressId" value={address.id} />
                        <Button type="submit" variant="secondary" disabled={settingDefault}>
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
                      <Button type="submit" variant="destructive" disabled={deleting}>
                        {deleting ? labels.deleting : labels.delete}
                      </Button>
                    </form>
                  </div>
                </div>
                {editingId === address.id ? (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <AddressForm
                      locale={locale}
                      labels={labels}
                      address={address}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <Separator />
        <div className="space-y-4">
          <h3 className="text-xl font-semibold leading-[1.3]">{labels.newAddress}</h3>
          <AddressForm locale={locale} labels={labels} />
        </div>
      </CardContent>
    </Card>
  );
}
