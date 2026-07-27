'use client';

import {useState} from 'react';
import {customerAddressToShippingAddress, type CustomerShippingAddress} from '@/account/addresses';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {Locale} from '@/i18n/routing';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

const copy = {
  en: {title: 'Saved address', choose: 'Choose an address', hint: 'Selecting an address recalculates shipping.'},
  vi: {title: 'Địa chỉ đã lưu', choose: 'Chọn một địa chỉ', hint: 'Phí giao hàng được tính lại ngay khi chọn địa chỉ.'}
} as const;

export function SavedAddressSelector({locale, addresses, pending, onApply}: {locale: Locale; addresses: CustomerShippingAddress[]; pending: boolean; onApply: (address: ShippingAddress) => void}) {
  const t = copy[locale];
  const [selectedId, setSelectedId] = useState(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
  if (!addresses.length) return null;
  return <section className="grid gap-2 border-b border-[var(--border)]/60 pb-4">
    <label className="grid gap-1.5" id="saved-address-label"><span className="text-sm font-semibold">{t.title}</span>
      <Select
        value={selectedId || undefined}
        disabled={pending}
        onValueChange={(nextId) => {
          setSelectedId(nextId);
          const address = addresses.find((candidate) => candidate.id === nextId);
          if (address) onApply(customerAddressToShippingAddress(address));
        }}
      >
        <SelectTrigger aria-labelledby="saved-address-label"><SelectValue placeholder={t.choose}/></SelectTrigger>
        <SelectContent>{addresses.map((address) => <SelectItem key={address.id} value={address.id}>{address.label} · {address.addressLine1}, {address.countryCode}</SelectItem>)}</SelectContent>
      </Select>
    </label>
    <p className="text-xs leading-5 text-[var(--muted-foreground)]">{t.hint}</p>
  </section>;
}
