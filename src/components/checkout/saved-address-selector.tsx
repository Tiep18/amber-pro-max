'use client';

import {useState, useTransition} from 'react';
import {customerAddressToShippingAddress, type CustomerShippingAddress} from '@/account/addresses';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import {buildSavedAddressQuoteRefreshInput} from '@/checkout/saved-addresses';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';
import {QuoteDiffDialog} from './quote-diff-dialog';

const copy = {
  en: {
    title: 'Use a saved address',
    intro: 'Pick an address from your account. We will recalculate shipping before changing the accepted total.',
    choose: 'Saved address',
    placeholder: 'Choose an address',
    apply: 'Use this address',
    pending: 'Checking quote',
    invalid: 'Choose a saved address first.',
    error: 'Saved address could not refresh the checkout quote.'
  },
  vi: {
    title: 'Dung dia chi da luu',
    intro: 'Chon dia chi trong tai khoan. He thong se tinh lai phi giao hang truoc khi doi tong tien da chap nhan.',
    choose: 'Dia chi da luu',
    placeholder: 'Chon dia chi',
    apply: 'Dung dia chi nay',
    pending: 'Dang kiem tra bao gia',
    invalid: 'Hay chon mot dia chi da luu truoc.',
    error: 'Khong the tinh lai bao gia tu dia chi da luu.'
  }
} as const;

function addressPreview(address: CustomerShippingAddress) {
  return [
    address.recipientName,
    address.phoneNumber,
    address.addressLine1,
    [address.locality, address.region, address.postalCode].filter(Boolean).join(', '),
    address.countryCode
  ].filter((line): line is string => Boolean(line));
}

export function SavedAddressSelector({
  locale,
  addresses,
  acceptedQuote,
  onShippingAddressSelected,
  onAcceptedQuote
}: {
  locale: Locale;
  addresses: CustomerShippingAddress[];
  acceptedQuote: CartQuote | null;
  onShippingAddressSelected: (address: ShippingAddress) => void;
  onAcceptedQuote: (quote: CartQuote) => void;
}) {
  const t = copy[locale];
  const [selectedId, setSelectedId] = useState(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{quote: CartQuote; changes: MaterialQuoteChange[]} | null>(null);
  const [pending, startTransition] = useTransition();

  if (addresses.length === 0) {
    return null;
  }

  const selectedAddress = addresses.find((address) => address.id === selectedId) ?? null;

  function applySelectedAddress() {
    setError(null);
    if (!selectedAddress) {
      setError(t.invalid);
      return;
    }

    const shippingAddress = customerAddressToShippingAddress(selectedAddress);
    onShippingAddressSelected(shippingAddress);
    startTransition(async () => {
      const result = await refreshCheckoutQuoteAction(buildSavedAddressQuoteRefreshInput({locale, acceptedQuote, shippingAddress}));
      if (result.status === 'invalid') {
        setError(t.invalid);
        return;
      }
      if (result.status === 'error') {
        setError(t.error);
        return;
      }
      if (result.materialChanges.length > 0) {
        setProposal({quote: result.quote, changes: result.materialChanges});
        return;
      }
      onAcceptedQuote(result.quote);
    });
  }

  return (
    <section className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">{t.title}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{t.intro}</p>
      </div>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-2" htmlFor="saved-address-selector">
          <span className="text-sm font-semibold">{t.choose}</span>
          <select
            id="saved-address-selector"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
          >
            <option value="">{t.placeholder}</option>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.label} - {address.addressLine1}, {address.countryCode}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" disabled={pending} onClick={applySelectedAddress}>
        {pending ? t.pending : t.apply}
        </Button>
      </div>
      {selectedAddress ? (
        <address className="grid gap-0.5 border-l-2 border-[var(--border)] pl-3 text-sm not-italic leading-6 text-[var(--muted-foreground)]">
          <strong className="font-semibold text-[var(--foreground)]">{selectedAddress.label}</strong>
          {addressPreview(selectedAddress).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
      ) : null}
      {proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={proposal.quote}
          changes={proposal.changes}
          onCancel={() => setProposal(null)}
          onConfirm={() => {
            onAcceptedQuote(proposal.quote);
            setProposal(null);
          }}
        />
      ) : null}
    </section>
  );
}
