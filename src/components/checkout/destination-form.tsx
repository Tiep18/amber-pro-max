'use client';

import {useState} from 'react';
import {getShippingCountryOptions, US_SHIPPING_REGION_OPTIONS, validateCheckoutShippingAddress} from '@/checkout/shipping-address-ui';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CheckoutQuoteLifecycleState, QuoteDestination} from '@/checkout/quote-lifecycle';
import type {Locale} from '@/i18n/routing';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

const copy = {
  en: {
    country: 'Shipping country', recipient: 'Recipient name', phone: 'Phone number', addressLine1: 'Street address',
    addressLine2: 'Apartment, suite, etc.', locality: 'City', region: 'State or territory', postalCode: 'ZIP or postal code',
    optional: 'Optional', countryPlaceholder: 'Choose a country', regionPlaceholder: 'Choose a state or territory',
    awaitingCountry: 'Choose a country to calculate shipping.', awaitingRegion: 'Choose a state or territory to finish calculating shipping.',
    calculating: 'Calculating shipping...', updating: 'Updating shipping. Your previous total remains visible.',
    ready: 'Shipping is calculated for this destination.', unsupported: 'We cannot ship these items to this destination. Edit the destination to try again.',
    network: 'We could not reach the shipping service. Change the destination or try again.', server: 'Shipping could not be calculated. Change the destination or try again.'
  },
  vi: {
    country: 'Quốc gia giao hàng', recipient: 'Tên người nhận', phone: 'Số điện thoại', addressLine1: 'Địa chỉ',
    addressLine2: 'Căn hộ, tầng, tòa nhà', locality: 'Thành phố', region: 'Bang hoặc vùng lãnh thổ', postalCode: 'Mã ZIP hoặc mã bưu chính',
    optional: 'Không bắt buộc', countryPlaceholder: 'Chọn quốc gia', regionPlaceholder: 'Chọn bang hoặc vùng lãnh thổ',
    awaitingCountry: 'Chọn quốc gia để tính phí giao hàng.', awaitingRegion: 'Chọn bang hoặc vùng lãnh thổ để hoàn tất tính phí.',
    calculating: 'Đang tính phí giao hàng...', updating: 'Đang cập nhật phí giao hàng. Tổng tiền trước đó vẫn được giữ nguyên.',
    ready: 'Đã tính phí giao hàng cho địa chỉ này.', unsupported: 'Hiện chưa thể giao các sản phẩm này tới địa chỉ đã chọn. Hãy chỉnh sửa địa chỉ để thử lại.',
    network: 'Không thể kết nối dịch vụ tính phí. Hãy thử lại hoặc đổi địa chỉ.', server: 'Không thể tính phí giao hàng. Hãy thử lại hoặc đổi địa chỉ.'
  }
} as const;

export type CheckoutShippingAddress = ShippingAddress;

export function DestinationForm({locale, shippingAddress, lifecycle, showValidation, onShippingAddressChange, onDestinationChange}: {
  locale: Locale;
  shippingAddress: CheckoutShippingAddress;
  lifecycle: CheckoutQuoteLifecycleState;
  showValidation: boolean;
  onShippingAddressChange: (address: CheckoutShippingAddress) => void;
  onDestinationChange: (destination: QuoteDestination) => void;
}) {
  const t = copy[locale];
  const [touched, setTouched] = useState(false);
  const countries = getShippingCountryOptions(locale);
  const errors = validateCheckoutShippingAddress(shippingAddress, locale);
  const revealErrors = showValidation || touched;
  const isUs = shippingAddress.countryCode === 'US';

  function update(patch: Partial<CheckoutShippingAddress>) {
    onShippingAddressChange({...shippingAddress, ...patch});
  }
  function errorFor(field: keyof CheckoutShippingAddress) {
    return revealErrors ? errors[field] : null;
  }
  const status = lifecycle.loadingMode === 'initial' ? t.calculating
    : lifecycle.loadingMode === 'updating' ? t.updating
      : lifecycle.issue?.kind === 'unsupported' ? t.unsupported
        : lifecycle.issue?.kind === 'network' ? t.network
          : lifecycle.issue?.kind === 'server' ? t.server
            : !shippingAddress.countryCode ? t.awaitingCountry
              : isUs && !shippingAddress.region ? t.awaitingRegion : t.ready;

  return <div className="grid gap-5">
    <div className="grid gap-2">
      <label className="font-semibold" id="shipping-country-label">{t.country} <span className="text-[var(--destructive)]">*</span></label>
      <Select value={shippingAddress.countryCode} onValueChange={(countryCode) => {
        const region = countryCode === 'US' ? shippingAddress.region : null;
        update({countryCode, region, postalCode: countryCode === 'US' ? shippingAddress.postalCode : shippingAddress.postalCode});
        onDestinationChange({countryCode, regionCode: region});
      }}>
        <SelectTrigger aria-labelledby="shipping-country-label" aria-invalid={Boolean(errorFor('countryCode'))}><SelectValue placeholder={t.countryPlaceholder}/></SelectTrigger>
        <SelectContent>{countries.map((country) => <SelectItem key={country.code} value={country.code}>{country.label} ({country.code})</SelectItem>)}</SelectContent>
      </Select>
      {errorFor('countryCode') ? <p className="text-sm font-medium text-[var(--destructive)]">{errorFor('countryCode')}</p> : null}
    </div>

    {isUs ? <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <label className="font-semibold" id="shipping-region-label">{t.region} <span className="text-[var(--destructive)]">*</span></label>
        <Select value={shippingAddress.region ?? ''} onValueChange={(region) => {update({region}); onDestinationChange({countryCode: 'US', regionCode: region});}}>
          <SelectTrigger aria-labelledby="shipping-region-label" aria-invalid={Boolean(errorFor('region'))}><SelectValue placeholder={t.regionPlaceholder}/></SelectTrigger>
          <SelectContent>{US_SHIPPING_REGION_OPTIONS.map((option) => <SelectItem key={option.code} value={option.code}>{option.code}</SelectItem>)}</SelectContent>
        </Select>
        {errorFor('region') ? <p className="text-sm font-medium text-[var(--destructive)]">{errorFor('region')}</p> : null}
      </div>
      <Field id="shipping-postal-code" label={t.postalCode} required value={shippingAddress.postalCode ?? ''} error={errorFor('postalCode')} onBlur={() => setTouched(true)} onChange={(postalCode) => update({postalCode})}/>
    </div> : null}

    <div role="status" aria-live="polite" className="flex min-h-14 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--muted-foreground)]">{status}</div>

    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="shipping-recipient-name" label={t.recipient} required value={shippingAddress.recipientName} error={errorFor('recipientName')} onBlur={() => setTouched(true)} onChange={(recipientName) => update({recipientName})}/>
      <Field id="shipping-phone-number" label={t.phone} required type="tel" value={shippingAddress.phoneNumber} error={errorFor('phoneNumber')} onBlur={() => setTouched(true)} onChange={(phoneNumber) => update({phoneNumber})}/>
    </div>
    <Field id="shipping-address-line-1" label={t.addressLine1} required value={shippingAddress.addressLine1} error={errorFor('addressLine1')} onBlur={() => setTouched(true)} onChange={(addressLine1) => update({addressLine1})}/>
    <Field id="shipping-address-line-2" label={t.addressLine2} optional={t.optional} value={shippingAddress.addressLine2 ?? ''} onChange={(addressLine2) => update({addressLine2})}/>
    <div className={`grid gap-3 ${isUs ? '' : 'sm:grid-cols-3'}`}>
      <Field id="shipping-locality" label={t.locality} optional={t.optional} value={shippingAddress.locality ?? ''} onChange={(locality) => update({locality})}/>
      {!isUs ? <Field id="shipping-region" label={t.region} optional={t.optional} value={shippingAddress.region ?? ''} onChange={(region) => update({region})}/> : null}
      {!isUs ? <Field id="shipping-postal-code" label={t.postalCode} optional={t.optional} value={shippingAddress.postalCode ?? ''} onChange={(postalCode) => update({postalCode})}/> : null}
    </div>
  </div>;
}

function Field({id, label, value, required, optional, type, error, onChange, onBlur}: {id: string; label: string; value: string; required?: boolean; optional?: string; type?: string; error?: string | null; onChange: (value: string) => void; onBlur?: () => void}) {
  return <label className="grid gap-2" htmlFor={id}>
    <span className="flex justify-between gap-3 font-semibold">{label}{required ? <span className="text-[var(--destructive)]">*</span> : optional ? <span className="text-xs font-medium text-[var(--muted-foreground)]">{optional}</span> : null}</span>
    <Input id={id} type={type} value={value} aria-invalid={Boolean(error)} onBlur={onBlur} onChange={(event) => onChange(event.target.value)}/>
    {error ? <span className="text-sm font-medium text-[var(--destructive)]">{error}</span> : null}
  </label>;
}
