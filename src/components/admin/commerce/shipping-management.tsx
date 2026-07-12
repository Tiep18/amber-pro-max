'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, ShieldCheck, Truck } from 'lucide-react';
import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { setStoreDefaultShippingProfileAction } from '@/checkout/admin-shipping-actions';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DeactivateShippingProfileButton } from './deactivate-shipping-profile-button';
import { ShippingRegionAdjustmentSheet } from './shipping-region-adjustment-sheet';
import { ShippingRuleSheet } from './shipping-rule-sheet';

export type AdminShippingRegionAdjustment = {
  id: string;
  shipping_rule_id: string;
  country_code: string;
  region_code: string;
  mode: 'surcharge' | 'replace';
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
};

export type AdminShippingRule = {
  id: string;
  profile_id: string;
  match_kind: 'exact_country' | 'fallback';
  country_code: string | null;
  currency_code: CurrencyCode;
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
  shipping_region_adjustments: AdminShippingRegionAdjustment[] | null;
};

export type AdminShippingProfile = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  assignmentCount: number;
  isDefault: boolean;
  shipping_rules: AdminShippingRule[] | null;
};

type RuleRow = AdminShippingRule & {
  profileName: string;
  profileActive: boolean;
};

function feeLabel(currencyCode: CurrencyCode, firstMinor: number, additionalMinor: number) {
  return `${formatMoney({ amountMinor: firstMinor, currencyCode })} first / ${formatMoney({
    amountMinor: additionalMinor,
    currencyCode
  })} additional`;
}

function destinationLabel(rule: Pick<AdminShippingRule, 'match_kind' | 'country_code'>) {
  return rule.match_kind === 'fallback' ? 'Other countries' : (rule.country_code ?? 'Unknown');
}

function SectionSurface({
  title,
  description,
  count,
  action,
  children
}: {
  title: string;
  description: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {count}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SetDefaultProfileButton({
  profile,
  currentDefaultName
}: {
  profile: AdminShippingProfile;
  currentDefaultName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="secondary"
        className="min-h-10 px-3 text-sm"
        disabled={pending || !profile.active}
        onClick={() => {
          const body = currentDefaultName
            ? `New unassigned products and variants will use "${profile.name}" instead of "${currentDefaultName}".`
            : `New unassigned products and variants will use "${profile.name}".`;
          if (!window.confirm(`Change the default parcel profile?\n\n${body}`)) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await setStoreDefaultShippingProfileAction(profile.id);
            if (result.status === 'updated') {
              router.refresh();
              return;
            }
            setError('Default parcel profile could not be changed.');
          });
        }}
      >
        {pending ? 'Setting default...' : 'Set as default'}
      </Button>
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
    </div>
  );
}

export function ShippingManagement({ profiles }: { profiles: AdminShippingProfile[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currency, setCurrency] = useState<'all' | CurrencyCode>('all');
  const currentDefault = profiles.find((profile) => profile.isDefault) ?? null;

  const rules = useMemo(
    () =>
      profiles.flatMap((profile) =>
        (profile.shipping_rules ?? []).map((rule) => ({
          ...rule,
          profileName: profile.name,
          profileActive: profile.active
        }))
      ),
    [profiles]
  );

  const adjustmentRows = useMemo(
    () =>
      rules.flatMap((rule) =>
        (rule.shipping_region_adjustments ?? []).map((adjustment) => ({
          ...adjustment,
          profileName: rule.profileName,
          destinationLabel: destinationLabel(rule),
          currencyCode: rule.currency_code
        }))
      ),
    [rules]
  );

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const profileRules = profile.shipping_rules ?? [];
      const matchesQuery =
        !normalized ||
        profile.name.toLowerCase().includes(normalized) ||
        (profile.description ?? '').toLowerCase().includes(normalized) ||
        profileRules.some((rule) =>
          `${destinationLabel(rule)} ${rule.currency_code}`.toLowerCase().includes(normalized)
        );
      const matchesStatus =
        status === 'all' || (status === 'active' ? profile.active : !profile.active);
      const matchesCurrency =
        currency === 'all' || profileRules.some((rule) => rule.currency_code === currency);
      return matchesQuery && matchesStatus && matchesCurrency;
    });
  }, [currency, profiles, query, status]);

  const sortedRules = useMemo(
    () =>
      rules
        .filter((rule) => currency === 'all' || rule.currency_code === currency)
        .slice()
        .sort((a, b) => {
          if (a.currency_code !== b.currency_code) {
            return a.currency_code.localeCompare(b.currency_code);
          }
          if (a.match_kind !== b.match_kind) {
            return a.match_kind === 'exact_country' ? -1 : 1;
          }
          return destinationLabel(a).localeCompare(destinationLabel(b));
        }),
    [currency, rules]
  );

  const ruleGroups = useMemo(() => {
    const groups = new Map<CurrencyCode, RuleRow[]>();
    for (const rule of sortedRules) {
      const group = groups.get(rule.currency_code) ?? [];
      group.push(rule);
      groups.set(rule.currency_code, group);
    }
    return Array.from(groups.entries());
  }, [sortedRules]);

  const activeProfileOptions = profiles.map(({ active, id, name }) => ({ active, id, name }));
  const ruleOptions = rules.map((rule) => ({
    id: rule.id,
    label: `${rule.profileName} - ${destinationLabel(rule)} - ${rule.currency_code}`,
    currencyCode: rule.currency_code,
    countryCode: rule.country_code
  }));

  return (
    <div className="grid gap-8">
      {!currentDefault ? (
        <Alert variant="warning">
          <AlertTitle>
            Shipping setup is not ready for destinations without an exact or attached profile rule.
          </AlertTitle>
          <p className="mt-1 text-sm">Select a default parcel profile to provide a fallback.</p>
        </Alert>
      ) : null}

      <SectionSurface
        title="Parcel profiles"
        description="Reusable parcel groups, default coverage, and assignment impact."
        count={filteredProfiles.length}
      >
        <div className="grid gap-2 border-b border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_150px_130px] sm:px-6">
          <label className="relative">
            <span className="sr-only">Search shipping profiles</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search profile or destination"
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

        {filteredProfiles.length === 0 ? (
          <AdminEmptyState
            icon={Truck}
            title={profiles.length ? 'No profiles match these filters.' : 'No parcel profiles yet.'}
            description={
              profiles.length
                ? 'Change the search, status, or currency filter.'
                : 'Add a profile to define package dimensions and weight.'
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredProfiles.map((profile) => (
              <article
                key={profile.id}
                className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_160px_140px_230px] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{profile.name}</h3>
                    {profile.isDefault ? (
                      <AdminStatusPill tone="success">Default</AdminStatusPill>
                    ) : null}
                    <AdminStatusPill tone={profile.active ? 'success' : 'default'}>
                      {profile.active ? 'Active' : 'Inactive'}
                    </AdminStatusPill>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                    {profile.description || 'No internal description'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">{profile.assignmentCount}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">assignments</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {(profile.shipping_rules ?? []).length}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">rules</p>
                </div>
                <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  {!profile.isDefault ? (
                    <SetDefaultProfileButton
                      profile={profile}
                      currentDefaultName={currentDefault?.name ?? null}
                    />
                  ) : null}
                  <DeactivateShippingProfileButton
                    profileId={profile.id}
                    profileName={profile.name}
                    disabled={!profile.active}
                    blockedReason={
                      profile.isDefault
                        ? `"${profile.name}" is the default parcel profile. Set another profile as default before deleting it.`
                        : undefined
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionSurface>

      <SectionSurface
        title="Destination rules"
        description="Exact country rows appear before the Other countries fallback for each currency."
        count={sortedRules.length}
        action={<ShippingRuleSheet profiles={activeProfileOptions} />}
      >
        {ruleGroups.length === 0 ? (
          <AdminEmptyState
            icon={MapPin}
            title="No destination rules for this currency."
            description="Add a country rule or an Other countries fallback."
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {ruleGroups.map(([groupCurrency, groupRules]) => (
              <div key={groupCurrency}>
                <div className="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-3 text-sm sm:px-6">
                  <span className="font-semibold">{groupCurrency}</span>
                  <span className="text-[var(--muted-foreground)]">{groupRules.length} rules</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {groupRules.map((rule) => (
                    <article
                      key={rule.id}
                      className="grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(140px,0.7fr)_minmax(180px,1fr)_minmax(230px,1.2fr)_120px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{destinationLabel(rule)}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {rule.match_kind === 'fallback' ? 'Fallback' : 'Specific country'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{rule.profileName}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">Parcel profile</p>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {feeLabel(
                          rule.currency_code,
                          rule.first_item_fee_minor,
                          rule.additional_item_fee_minor
                        )}
                      </p>
                      <div className="flex justify-start lg:justify-end">
                        <AdminStatusPill
                          tone={rule.active && rule.profileActive ? 'success' : 'default'}
                        >
                          {rule.active && rule.profileActive ? 'Active' : 'Inactive'}
                        </AdminStatusPill>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionSurface>

      <SectionSurface
        title="US region adjustments"
        description="Regional surcharge or replacement rules layered on top of US shipping."
        count={adjustmentRows.length}
        action={<ShippingRegionAdjustmentSheet rules={ruleOptions} />}
      >
        {adjustmentRows.length === 0 ? (
          <AdminEmptyState
            icon={ShieldCheck}
            title="No US region adjustments."
            description="Standard destination rules apply to every state and territory."
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {adjustmentRows.map((adjustment) => (
              <article
                key={adjustment.id}
                className="grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[110px_minmax(220px,1fr)_170px_minmax(230px,1fr)_110px] lg:items-center"
              >
                <div>
                  <p className="font-semibold">{adjustment.region_code}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">US region</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{adjustment.profileName}</p>
                  <p className="truncate text-sm text-[var(--muted-foreground)]">
                    {adjustment.destinationLabel} - {adjustment.currencyCode}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {adjustment.mode === 'surcharge' ? 'Add surcharge' : 'Replace shipping fee'}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {feeLabel(
                    adjustment.currencyCode,
                    adjustment.first_item_fee_minor,
                    adjustment.additional_item_fee_minor
                  )}
                </p>
                <div className="flex justify-start lg:justify-end">
                  <AdminStatusPill tone={adjustment.active ? 'success' : 'default'}>
                    {adjustment.active ? 'Active' : 'Inactive'}
                  </AdminStatusPill>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionSurface>
    </div>
  );
}
