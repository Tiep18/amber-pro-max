'use client';

import { useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DeactivateShippingProfileButton } from './deactivate-shipping-profile-button';
import {ShippingRuleSheet} from './shipping-rule-sheet';

export type AdminShippingRule = {
  id: string;
  country_code: string;
  currency_code: CurrencyCode;
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
};

export type AdminShippingProfile = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  shipping_rules: AdminShippingRule[] | null;
};

function feeLabel(rule: AdminShippingRule) {
  return `${formatMoney({ amountMinor: rule.first_item_fee_minor, currencyCode: rule.currency_code })} first / ${formatMoney({ amountMinor: rule.additional_item_fee_minor, currencyCode: rule.currency_code })} additional`;
}

export function ShippingProfileList({ profiles }: { profiles: AdminShippingProfile[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currency, setCurrency] = useState<'all' | CurrencyCode>('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const rules = profile.shipping_rules ?? [];
      const matchesQuery =
        !normalized ||
        profile.name.toLowerCase().includes(normalized) ||
        (profile.description ?? '').toLowerCase().includes(normalized) ||
        rules.some((rule) => rule.country_code.toLowerCase().includes(normalized));
      const matchesStatus =
        status === 'all' || (status === 'active' ? profile.active : !profile.active);
      const matchesCurrency =
        currency === 'all' || rules.some((rule) => rule.currency_code === currency);
      return matchesQuery && matchesStatus && matchesCurrency;
    });
  }, [currency, profiles, query, status]);

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Shipping profile queue</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {filtered.length}/{profiles.length}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            Review destination coverage, fees, and availability.
          </p>
        </div>
        <ShippingRuleSheet profiles={profiles.map(({id, name, active}) => ({id, name, active}))} />
        <div className="grid gap-2 sm:grid-cols-[minmax(190px,1fr)_140px_130px]">
          <label className="relative">
            <span className="sr-only">Search shipping profiles</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search profile or country"
              className="min-h-10 pl-9 text-sm"
            />
          </label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger aria-label="Filter by status" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currency} onValueChange={(value) => setCurrency(value as typeof currency)}>
            <SelectTrigger aria-label="Filter by currency" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="VND">VND</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={MapPin}
          title={profiles.length ? 'No profiles match these filters.' : 'No shipping profiles yet.'}
          description={
            profiles.length
              ? 'Change the search, status, or currency filter.'
              : 'Use New profile in the page header to configure the first destination.'
          }
        />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((profile) => (
            <article
              key={profile.id}
              className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(180px,0.8fr)_minmax(300px,1.5fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate font-semibold">{profile.name}</h3>
                  <AdminStatusPill tone={profile.active ? 'success' : 'default'}>
                    {profile.active ? 'Active' : 'Inactive'}
                  </AdminStatusPill>
                </div>
                <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                  {profile.description || 'No internal description'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(profile.shipping_rules ?? []).map((rule) => (
                  <div
                    key={rule.id}
                    className="min-w-0 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/65 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {rule.country_code} · {rule.currency_code}
                      </span>
                      {!rule.active ? (
                        <span className="text-xs text-[var(--muted-foreground)]">Inactive</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                      {feeLabel(rule)}
                    </p>
                  </div>
                ))}
                {(profile.shipping_rules ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No fee rules attached.</p>
                ) : null}
              </div>
              <div className="flex justify-end lg:justify-start">
                <DeactivateShippingProfileButton
                  profileId={profile.id}
                  profileName={profile.name}
                  disabled={!profile.active}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
