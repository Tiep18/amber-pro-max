'use client';

import {useState, useTransition} from 'react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {QuoteDiffDialog} from './quote-diff-dialog';

const copy = {
  en: {
    country: 'Shipping country',
    recipient: 'Recipient name',
    phone: 'Phone number',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2',
    locality: 'City',
    region: 'State / province',
    postalCode: 'Postal code',
    submit: 'Update destination',
    pending: 'Calculating',
    invalid: 'Choose a shipping country and complete the required address fields.',
    error: 'Destination could not be calculated.'
  },
  vi: {
    country: 'Quoc gia giao hang',
    recipient: 'Ten nguoi nhan',
    phone: 'So dien thoai',
    addressLine1: 'Dia chi dong 1',
    addressLine2: 'Dia chi dong 2',
    locality: 'Thanh pho',
    region: 'Tinh / bang',
    postalCode: 'Ma buu chinh',
    submit: 'Cap nhat dia chi giao hang',
    pending: 'Dang tinh',
    invalid: 'Chon quoc gia giao hang va dien cac thong tin dia chi bat buoc.',
    error: 'Khong the tinh dia diem giao hang.'
  }
} as const;

const countries = [
  {code: 'VN', en: 'Vietnam', vi: 'Viet Nam'},
  {code: 'US', en: 'United States', vi: 'Hoa Ky'},
  {code: 'CA', en: 'Canada', vi: 'Canada'},
  {code: 'AU', en: 'Australia', vi: 'Uc'},
  {code: 'GB', en: 'United Kingdom', vi: 'Vuong quoc Anh'}
] as const;

export type CheckoutShippingAddress = ShippingAddress;

const emptyAddress: CheckoutShippingAddress = {
  recipientName: '',
  phoneNumber: '',
  countryCode: '',
  region: null,
  locality: null,
  addressLine1: '',
  addressLine2: null,
  postalCode: null
};

export function DestinationForm({
  locale,
  acceptedQuote,
  shippingAddress,
  onShippingAddressChange,
  onAcceptedQuote
}: {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  shippingAddress: CheckoutShippingAddress;
  onShippingAddressChange: (address: CheckoutShippingAddress) => void;
  onAcceptedQuote: (quote: CartQuote) => void;
}) {
  const t = copy[locale];
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{quote: CartQuote; changes: MaterialQuoteChange[]} | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [pending, startTransition] = useTransition();
  const addressReady =
    shippingAddress.countryCode.length === 2 &&
    shippingAddress.recipientName.trim().length > 0 &&
    shippingAddress.phoneNumber.trim().length >= 5 &&
    shippingAddress.addressLine1.trim().length > 0;

  function updateAddress(patch: Partial<CheckoutShippingAddress>) {
    onShippingAddressChange({...emptyAddress, ...shippingAddress, ...patch});
  }

  function submit() {
    setError(null);
    if (!addressReady) {
      setError(t.invalid);
      return;
    }
    startTransition(async () => {
      const result = await refreshCheckoutQuoteAction({
        locale,
        market: acceptedQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
        lines: acceptedQuote?.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.requestedQuantity,
          marketAtAdd: line.marketAtAdd,
          addedAt: acceptedQuote.quotedAt,
          updatedAt: acceptedQuote.quotedAt
        })) ?? [],
        destinationCountryCode: shippingAddress.countryCode,
        acceptedQuote
      });
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
    <div className="grid gap-3">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">{t.country}</span>
        <input
          value={countrySearch || (countries.find((country) => country.code === shippingAddress.countryCode)?.[locale] ?? '')}
          list="shipping-country-options"
          onChange={(event) => {
            const rawValue = event.target.value;
            setCountrySearch(rawValue);
            const value = rawValue.trim().toLowerCase();
            const selected = countries.find(
              (country) =>
                country.code.toLowerCase() === value ||
                country.en.toLowerCase() === value ||
                country.vi.toLowerCase() === value
            );
            updateAddress({countryCode: selected?.code ?? shippingAddress.countryCode});
            if (selected) {
              setCountrySearch(selected[locale]);
            }
          }}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
        <datalist id="shipping-country-options">
          {countries.map((country) => (
            <option key={country.code} value={country[locale]}>
              {country.code}
            </option>
          ))}
        </datalist>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">{t.recipient}</span>
          <input
            value={shippingAddress.recipientName}
            onChange={(event) => updateAddress({recipientName: event.target.value})}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">{t.phone}</span>
          <input
            value={shippingAddress.phoneNumber}
            onChange={(event) => updateAddress({phoneNumber: event.target.value})}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className="font-semibold">{t.addressLine1}</span>
        <input
          value={shippingAddress.addressLine1}
          onChange={(event) => updateAddress({addressLine1: event.target.value})}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">{t.addressLine2}</span>
        <input
          value={shippingAddress.addressLine2 ?? ''}
          onChange={(event) => updateAddress({addressLine2: event.target.value})}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="font-semibold">{t.locality}</span>
          <input
            value={shippingAddress.locality ?? ''}
            onChange={(event) => updateAddress({locality: event.target.value})}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">{t.region}</span>
          <input
            value={shippingAddress.region ?? ''}
            onChange={(event) => updateAddress({region: event.target.value})}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">{t.postalCode}</span>
          <input
            value={shippingAddress.postalCode ?? ''}
            onChange={(event) => updateAddress({postalCode: event.target.value})}
            className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          />
        </label>
      </div>
      <Button disabled={pending || !addressReady} onClick={submit}>
        {pending ? t.pending : t.submit}
      </Button>
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
    </div>
  );
}
