'use client';

import {useState, useTransition} from 'react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import {getShippingCountryOptions, validateCheckoutShippingAddress} from '@/checkout/shipping-address-ui';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
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
    optional: 'Optional',
    searchCountry: 'Search countries',
    clearCountry: 'Clear country',
    countryPlaceholder: 'Select a country',
    noCountryResults: 'No matching countries',
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
    optional: 'Khong bat buoc',
    searchCountry: 'Tim quoc gia',
    clearCountry: 'Xoa quoc gia',
    countryPlaceholder: 'Chon quoc gia',
    noCountryResults: 'Khong tim thay quoc gia phu hop',
    submit: 'Cap nhat dia chi giao hang',
    pending: 'Dang tinh',
    invalid: 'Chon quoc gia giao hang va dien cac thong tin dia chi bat buoc.',
    error: 'Khong the tinh dia diem giao hang.'
  }
} as const;

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
  const [showValidation, setShowValidation] = useState(false);
  const [pending, startTransition] = useTransition();
  const countries = getShippingCountryOptions(locale);
  const selectedCountry = countries.find((country) => country.code === shippingAddress.countryCode) ?? null;
  const filteredCountries = countrySearch.trim()
    ? countries.filter((country) => country.searchText.includes(countrySearch.trim().toLowerCase())).slice(0, 60)
    : countries;
  const visibleCountries =
    selectedCountry && !filteredCountries.some((country) => country.code === selectedCountry.code)
      ? [selectedCountry, ...filteredCountries]
      : filteredCountries;
  const validationErrors = validateCheckoutShippingAddress(shippingAddress, locale);
  const addressReady = Object.keys(validationErrors).length === 0;

  function fieldError(field: keyof CheckoutShippingAddress) {
    return showValidation ? validationErrors[field] : null;
  }

  function updateAddress(patch: Partial<CheckoutShippingAddress>) {
    onShippingAddressChange({...emptyAddress, ...shippingAddress, ...patch});
  }

  function submit() {
    setShowValidation(true);
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
    <div className="grid gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="shipping-country-search" className="font-semibold">
            {t.country} <span className="text-[var(--destructive)]">*</span>
          </label>
          {selectedCountry ? (
            <Button
              variant="ghost"
              className="min-h-9 px-2 text-sm"
              onClick={() => {
                setCountrySearch('');
                updateAddress({countryCode: ''});
              }}
            >
              {t.clearCountry}
            </Button>
          ) : null}
        </div>
        <Input
          id="shipping-country-search"
          value={countrySearch}
          placeholder={selectedCountry ? `${selectedCountry.label} (${selectedCountry.code})` : t.searchCountry}
          onChange={(event) => setCountrySearch(event.target.value)}
          onBlur={() => setShowValidation(true)}
          aria-describedby={fieldError('countryCode') ? 'shipping-country-error' : undefined}
          aria-invalid={Boolean(fieldError('countryCode'))}
          className="min-h-10 rounded-b-none text-sm"
        />
        <select
          value={shippingAddress.countryCode}
          onChange={(event) => {
            updateAddress({countryCode: event.target.value});
            setCountrySearch('');
            setShowValidation(true);
          }}
          aria-label={t.country}
          aria-describedby={fieldError('countryCode') ? 'shipping-country-error' : undefined}
          aria-invalid={Boolean(fieldError('countryCode'))}
          className="min-h-11 w-full rounded-b-[var(--radius-control)] border border-t-0 border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">{t.countryPlaceholder}</option>
          {visibleCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label} ({country.code})
            </option>
          ))}
          {visibleCountries.length === 0 ? (
            <option value="" disabled>
              {t.noCountryResults}
            </option>
          ) : null}
        </select>
        {fieldError('countryCode') ? (
          <p id="shipping-country-error" className="text-sm font-medium text-[var(--destructive)]">
            {fieldError('countryCode')}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2" htmlFor="shipping-recipient-name">
          <span className="font-semibold">
            {t.recipient} <span className="text-[var(--destructive)]">*</span>
          </span>
        <Input
            id="shipping-recipient-name"
            value={shippingAddress.recipientName}
            onChange={(event) => updateAddress({recipientName: event.target.value})}
            onBlur={() => setShowValidation(true)}
            aria-describedby={fieldError('recipientName') ? 'shipping-recipient-name-error' : undefined}
            aria-invalid={Boolean(fieldError('recipientName'))}
          />
          {fieldError('recipientName') ? (
            <p id="shipping-recipient-name-error" className="text-sm font-medium text-[var(--destructive)]">
              {fieldError('recipientName')}
            </p>
          ) : null}
        </label>
        <label className="space-y-2" htmlFor="shipping-phone-number">
          <span className="font-semibold">
            {t.phone} <span className="text-[var(--destructive)]">*</span>
          </span>
          <Input
            id="shipping-phone-number"
            type="tel"
            autoComplete="tel"
            value={shippingAddress.phoneNumber}
            onChange={(event) => updateAddress({phoneNumber: event.target.value})}
            onBlur={() => setShowValidation(true)}
            aria-describedby={fieldError('phoneNumber') ? 'shipping-phone-number-error' : undefined}
            aria-invalid={Boolean(fieldError('phoneNumber'))}
          />
          {fieldError('phoneNumber') ? (
            <p id="shipping-phone-number-error" className="text-sm font-medium text-[var(--destructive)]">
              {fieldError('phoneNumber')}
            </p>
          ) : null}
        </label>
      </div>
      <label className="space-y-2" htmlFor="shipping-address-line-1">
        <span className="font-semibold">
          {t.addressLine1} <span className="text-[var(--destructive)]">*</span>
        </span>
        <Input
          id="shipping-address-line-1"
          autoComplete="address-line1"
          value={shippingAddress.addressLine1}
          onChange={(event) => updateAddress({addressLine1: event.target.value})}
          onBlur={() => setShowValidation(true)}
          aria-describedby={fieldError('addressLine1') ? 'shipping-address-line-1-error' : undefined}
          aria-invalid={Boolean(fieldError('addressLine1'))}
        />
        {fieldError('addressLine1') ? (
          <p id="shipping-address-line-1-error" className="text-sm font-medium text-[var(--destructive)]">
            {fieldError('addressLine1')}
          </p>
        ) : null}
      </label>
      <label className="space-y-2" htmlFor="shipping-address-line-2">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold">{t.addressLine2}</span>
          <span className="text-xs font-medium text-[var(--muted-foreground)]">{t.optional}</span>
        </span>
        <Input
          id="shipping-address-line-2"
          autoComplete="address-line2"
          value={shippingAddress.addressLine2 ?? ''}
          onChange={(event) => updateAddress({addressLine2: event.target.value})}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-2" htmlFor="shipping-locality">
          <span className="flex items-center justify-between gap-3">
            <span className="font-semibold">{t.locality}</span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{t.optional}</span>
          </span>
          <Input
            id="shipping-locality"
            autoComplete="address-level2"
            value={shippingAddress.locality ?? ''}
            onChange={(event) => updateAddress({locality: event.target.value})}
          />
        </label>
        <label className="space-y-2" htmlFor="shipping-region">
          <span className="flex items-center justify-between gap-3">
            <span className="font-semibold">{t.region}</span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{t.optional}</span>
          </span>
          <Input
            id="shipping-region"
            autoComplete="address-level1"
            value={shippingAddress.region ?? ''}
            onChange={(event) => updateAddress({region: event.target.value})}
          />
        </label>
        <label className="space-y-2" htmlFor="shipping-postal-code">
          <span className="flex items-center justify-between gap-3">
            <span className="font-semibold">{t.postalCode}</span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{t.optional}</span>
          </span>
          <Input
            id="shipping-postal-code"
            autoComplete="postal-code"
            value={shippingAddress.postalCode ?? ''}
            onChange={(event) => updateAddress({postalCode: event.target.value})}
          />
        </label>
      </div>
      <Button disabled={pending} onClick={submit} aria-disabled={!addressReady || pending} className="w-full sm:w-auto">
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
