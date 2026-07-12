'use client';

import {useState} from 'react';
import {customerAddressToShippingAddress, type CustomerShippingAddress} from '@/account/addresses';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

const copy = {
  en: {title: 'Saved address', choose: 'Choose an address', apply: 'Use this address'},
  vi: {title: 'Địa chỉ đã lưu', choose: 'Chọn một địa chỉ', apply: 'Dùng địa chỉ này'}
} as const;

export function SavedAddressSelector({locale, addresses, pending, onApply}: {locale: Locale; addresses: CustomerShippingAddress[]; pending: boolean; onApply: (address: ShippingAddress) => void}) {
  const t = copy[locale];
  const [selectedId, setSelectedId] = useState(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
  const selected = addresses.find((address) => address.id === selectedId) ?? null;
  if (!addresses.length) return null;
  return <section className="grid gap-3 border-b border-[var(--border)] pb-5">
    <label className="grid gap-2" id="saved-address-label"><span className="font-semibold">{t.title}</span>
      <Select value={selectedId || undefined} onValueChange={setSelectedId}>
        <SelectTrigger aria-labelledby="saved-address-label"><SelectValue placeholder={t.choose}/></SelectTrigger>
        <SelectContent>{addresses.map((address) => <SelectItem key={address.id} value={address.id}>{address.label} · {address.addressLine1}, {address.countryCode}</SelectItem>)}</SelectContent>
      </Select>
    </label>
    <Button type="button" variant="secondary" className="w-full sm:w-fit" disabled={!selected || pending} onClick={() => selected && onApply(customerAddressToShippingAddress(selected))}>{t.apply}</Button>
  </section>;
}
