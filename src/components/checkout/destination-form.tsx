'use client';

import {useMemo, useState} from 'react';
import {createTranslator} from 'next-intl';
import {
  getShippingCountryOptions,
  getUsShippingRegionOptions,
  getVietnamProvinceOptions,
  getVietnamWardOptions,
  validateCheckoutShippingAddress
} from '@/checkout/shipping-address-ui';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CheckoutQuoteLifecycleState, QuoteDestination} from '@/checkout/quote-lifecycle';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import {Input} from '@/components/ui/input';
import {SearchableSelect} from '@/components/ui/searchable-select';

export type CheckoutShippingAddress = ShippingAddress;
type AddressField = keyof CheckoutShippingAddress;

export function DestinationForm({
  locale,
  shippingAddress,
  lifecycle,
  showValidation,
  disabled = false,
  onShippingAddressChange,
  onDestinationChange
}: {
  locale: Locale;
  shippingAddress: CheckoutShippingAddress;
  lifecycle: CheckoutQuoteLifecycleState;
  showValidation: boolean;
  disabled?: boolean;
  onShippingAddressChange: (address: CheckoutShippingAddress) => void;
  onDestinationChange: (destination: QuoteDestination) => void;
}) {
  const translate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.address'
  });
  const t = {
    country: translate('country'), recipient: translate('recipient'), phone: translate('phone'),
    addressLine1: translate('addressLine1'), addressLine2: translate('addressLine2'), locality: translate('locality'),
    region: translate('region'), postalCode: translate('postalCode'), province: translate('province'), ward: translate('ward'),
    vnStreet: translate('vnStreet'), district: translate('district'), optional: translate('optional'),
    countryPlaceholder: translate('countryPlaceholder'), regionPlaceholder: translate('regionPlaceholder'),
    provincePlaceholder: translate('provincePlaceholder'), wardPlaceholder: translate('wardPlaceholder'),
    searchCountry: translate('searchCountry'), searchRegion: translate('searchRegion'), searchProvince: translate('searchProvince'),
    searchWard: translate('searchWard'), noResults: translate('noResults'), awaitingCountry: translate('awaitingCountry'),
    awaitingRegion: translate('awaitingRegion'), calculating: translate('calculating'), updating: translate('updating'),
    ready: translate('ready'), unsupported: translate('unsupported'), network: translate('network'), server: translate('server'),
    wardReselection: translate('wardReselection')
  };
  const [touchedFields, setTouchedFields] = useState<Set<AddressField>>(() => new Set());
  const [wardReselection, setWardReselection] = useState(false);
  const countries = useMemo(() => getShippingCountryOptions(locale), [locale]);
  const usRegions = useMemo(() => getUsShippingRegionOptions(locale), [locale]);
  const vietnamProvinces = useMemo(() => getVietnamProvinceOptions(), []);
  const selectedProvinceCode = vietnamProvinces.find(
    (province) => province.code === shippingAddress.region || province.label === shippingAddress.region
  )?.code ?? '';
  const vietnamWards = useMemo(
    () => getVietnamWardOptions(selectedProvinceCode),
    [selectedProvinceCode]
  );
  const selectedWardCode = vietnamWards.find(
    (ward) => ward.code === shippingAddress.locality || ward.label === shippingAddress.locality
  )?.code ?? '';
  const errors = validateCheckoutShippingAddress(shippingAddress, locale);
  const isUs = shippingAddress.countryCode === 'US';
  const isVietnam = shippingAddress.countryCode === 'VN';

  function touch(field: AddressField) {
    setTouchedFields((current) => {
      if (current.has(field)) return current;
      const next = new Set(current);
      next.add(field);
      return next;
    });
  }

  function update(patch: Partial<CheckoutShippingAddress>) {
    onShippingAddressChange({...shippingAddress, ...patch});
  }

  function errorFor(field: AddressField) {
    return showValidation || touchedFields.has(field) ? errors[field] : null;
  }

  const status = lifecycle.loadingMode === 'initial' ? t.calculating
    : lifecycle.loadingMode === 'updating' ? t.updating
      : lifecycle.issue?.kind === 'unsupported' ? t.unsupported
        : lifecycle.issue?.kind === 'network' ? t.network
          : lifecycle.issue?.kind === 'server' ? t.server
            : !shippingAddress.countryCode ? t.awaitingCountry
              : isUs && !shippingAddress.region ? t.awaitingRegion : t.ready;

  return (
    <div className="grid gap-4">
      <SearchableField
        field="countryCode"
        id="shipping-country-trigger"
        label={t.country}
        locale={locale}
        placeholder={t.countryPlaceholder}
        searchLabel={t.searchCountry}
        emptyLabel={t.noResults}
        options={countries}
        value={shippingAddress.countryCode}
        error={errorFor('countryCode')}
        disabled={disabled}
        onTouched={() => touch('countryCode')}
        onValueChange={(countryCode) => {
          const countryChanged = countryCode !== shippingAddress.countryCode;
          update({
            countryCode,
            region: countryChanged ? null : shippingAddress.region,
            locality: countryChanged ? null : shippingAddress.locality,
            postalCode: countryChanged ? null : shippingAddress.postalCode
          });
          setWardReselection(false);
          onDestinationChange({countryCode, regionCode: null});
        }}
      />

      <div role="status" aria-live="polite" className="flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 px-3 py-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${lifecycle.issue ? 'bg-[var(--warning)]' : lifecycle.activeRequestId !== null ? 'animate-pulse motion-reduce:animate-none bg-[var(--accent)]' : 'bg-[var(--success)]'}`} />
        <span className="min-w-0 break-words">{status}</span>
      </div>

      {shippingAddress.countryCode ? (
        <div className="grid gap-4 border-t border-[var(--border)]/60 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="shipping-recipient-name" field="recipientName" label={t.recipient} autoComplete="name" required value={shippingAddress.recipientName} error={errorFor('recipientName')} disabled={disabled} onBlur={() => touch('recipientName')} onChange={(recipientName) => update({recipientName})}/>
            <Field id="shipping-phone-number" field="phoneNumber" label={t.phone} autoComplete="tel" required type="tel" value={shippingAddress.phoneNumber} error={errorFor('phoneNumber')} disabled={disabled} onBlur={() => touch('phoneNumber')} onChange={(phoneNumber) => update({phoneNumber})}/>
          </div>

          {isVietnam ? (
            <>
              <SearchableField
                field="region"
                id="shipping-region-trigger"
                label={t.province}
                locale={locale}
                placeholder={t.provincePlaceholder}
                searchLabel={t.searchProvince}
                emptyLabel={t.noResults}
                options={vietnamProvinces}
                value={selectedProvinceCode}
                error={errorFor('region')}
                disabled={disabled}
                onTouched={() => touch('region')}
                onValueChange={(region) => {
                  const wardStillValid = getVietnamWardOptions(region).some(
                    (ward) => ward.code === shippingAddress.locality || ward.label === shippingAddress.locality
                  );
                  const shouldClearWard = Boolean(shippingAddress.locality) && !wardStillValid;
                  update({region, locality: wardStillValid ? shippingAddress.locality : null});
                  setWardReselection(shouldClearWard);
                }}
              />
              <SearchableField
                field="locality"
                id="shipping-locality-trigger"
                label={t.ward}
                locale={locale}
                placeholder={t.wardPlaceholder}
                searchLabel={t.searchWard}
                emptyLabel={t.noResults}
                options={vietnamWards}
                value={selectedWardCode}
                error={errorFor('locality')}
                disabled={disabled || !selectedProvinceCode}
                onTouched={() => touch('locality')}
                onValueChange={(locality) => {
                  update({locality});
                  setWardReselection(false);
                }}
              />
              {wardReselection ? <p role="status" className="text-sm leading-5 text-[var(--warning)]">{t.wardReselection}</p> : null}
              <Field id="shipping-address-line-1" field="addressLine1" label={t.vnStreet} autoComplete="address-line1" required value={shippingAddress.addressLine1} error={errorFor('addressLine1')} disabled={disabled} onBlur={() => touch('addressLine1')} onChange={(addressLine1) => update({addressLine1})}/>
              <Field id="shipping-address-line-2" field="addressLine2" label={t.district} autoComplete="address-level2" optional={t.optional} value={shippingAddress.addressLine2 ?? ''} disabled={disabled} onChange={(addressLine2) => update({addressLine2})}/>
            </>
          ) : (
            <>
              {isUs ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SearchableField
                    field="region"
                    id="shipping-region-trigger"
                    label={t.region}
                    locale={locale}
                    placeholder={t.regionPlaceholder}
                    searchLabel={t.searchRegion}
                    emptyLabel={t.noResults}
                    options={usRegions}
                    value={shippingAddress.region ?? ''}
                    error={errorFor('region')}
                    disabled={disabled}
                    onTouched={() => touch('region')}
                    onValueChange={(region) => {
                      update({region});
                      onDestinationChange({countryCode: 'US', regionCode: region});
                    }}
                  />
                  <Field id="shipping-postal-code" field="postalCode" label={t.postalCode} autoComplete="postal-code" required value={shippingAddress.postalCode ?? ''} error={errorFor('postalCode')} disabled={disabled} onBlur={() => touch('postalCode')} onChange={(postalCode) => update({postalCode})}/>
                </div>
              ) : null}
              <Field id="shipping-address-line-1" field="addressLine1" label={t.addressLine1} autoComplete="address-line1" required value={shippingAddress.addressLine1} error={errorFor('addressLine1')} disabled={disabled} onBlur={() => touch('addressLine1')} onChange={(addressLine1) => update({addressLine1})}/>
              <Field id="shipping-address-line-2" field="addressLine2" label={t.addressLine2} autoComplete="address-line2" optional={t.optional} value={shippingAddress.addressLine2 ?? ''} disabled={disabled} onChange={(addressLine2) => update({addressLine2})}/>
              {!isUs ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field id="shipping-locality" field="locality" label={t.locality} autoComplete="address-level2" optional={t.optional} value={shippingAddress.locality ?? ''} disabled={disabled} onChange={(locality) => update({locality})}/>
                  <Field id="shipping-region" field="region" label={t.region} autoComplete="address-level1" optional={t.optional} value={shippingAddress.region ?? ''} disabled={disabled} onChange={(region) => update({region})}/>
                  <Field id="shipping-postal-code" field="postalCode" label={t.postalCode} autoComplete="postal-code" optional={t.optional} value={shippingAddress.postalCode ?? ''} disabled={disabled} onChange={(postalCode) => update({postalCode})}/>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchableField({field, id, label, locale, placeholder, searchLabel, emptyLabel, options, value, error, disabled, onValueChange, onTouched}: {
  field: AddressField;
  id: string;
  label: string;
  locale: Locale;
  placeholder: string;
  searchLabel: string;
  emptyLabel: string;
  options: ReturnType<typeof getShippingCountryOptions>;
  value: string;
  error?: string | null;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onTouched: () => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5" data-field={field}>
      <label className="text-sm font-semibold" htmlFor={id}>{label} <span className="text-[var(--destructive)]">*</span></label>
      <SearchableSelect
        id={id}
        locale={locale}
        label={label}
        placeholder={placeholder}
        searchLabel={searchLabel}
        emptyLabel={emptyLabel}
        options={options}
        value={value}
        disabled={disabled}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
        errorMessageId={errorId}
        onValueChange={onValueChange}
        onTouched={onTouched}
      />
      {error ? <p id={errorId} className="text-sm font-medium leading-5 text-[var(--destructive)]">{error}</p> : null}
    </div>
  );
}

function Field({id, field, label, value, required, optional, type, autoComplete, error, disabled, onChange, onBlur}: {
  id: string;
  field: AddressField;
  label: string;
  value: string;
  required?: boolean;
  optional?: string;
  type?: string;
  autoComplete?: string;
  error?: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="grid gap-1.5" htmlFor={id} data-field={field}>
      <span className="flex justify-between gap-3 text-sm font-semibold">{label}{required ? <span className="text-[var(--destructive)]">*</span> : optional ? <span className="text-xs font-medium text-[var(--muted-foreground)]">{optional}</span> : null}</span>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        aria-errormessage={error ? errorId : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span id={errorId} className="text-sm font-medium leading-5 text-[var(--destructive)]">{error}</span> : null}
    </label>
  );
}
