'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, MapPin, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';
import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { setStoreDefaultShippingProfileAction } from '@/checkout/admin-shipping-actions';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
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

type AdjustmentGroup = {
  key: string;
  profileName: string;
  destinationLabel: string;
  currencyCode: CurrencyCode;
  codes: string[];
  mode: 'surcharge' | 'replace';
  firstItemFeeMinor: number;
  additionalItemFeeMinor: number;
  active: boolean;
};

function feeLabel(currencyCode: CurrencyCode, firstMinor: number, additionalMinor: number) {
  return `${formatMoney({ amountMinor: firstMinor, currencyCode })} first / ${formatMoney({
    amountMinor: additionalMinor,
    currencyCode
  })} additional`;
}

function destinationLabel(rule: Pick<AdminShippingRule, 'match_kind' | 'country_code'>) {
  if (rule.match_kind === 'fallback') return 'Other countries';
  if (rule.country_code === 'VN') return 'Vietnam';
  if (rule.country_code === 'US') return 'United States';
  return rule.country_code ?? 'Unknown';
}

function destinationMeta(rule: Pick<AdminShippingRule, 'match_kind' | 'country_code'>) {
  if (rule.match_kind === 'fallback') {
    return { label: 'Other countries', detail: 'Fallback coverage', priority: 30 };
  }
  if (rule.country_code === 'VN') {
    return { label: 'Vietnam', detail: 'Country code VN', priority: 10 };
  }
  if (rule.country_code === 'US') {
    return { label: 'United States', detail: 'Country code US', priority: 20 };
  }
  return {
    label: rule.country_code ?? 'Unknown',
    detail: 'Specific country',
    priority: 40
  };
}

function summarizeCodes(codes: string[]) {
  const visible = codes.slice(0, 3).join(', ');
  const remaining = codes.length - 3;
  return remaining > 0 ? `${visible} +${remaining} more` : visible;
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

function ReadinessPanel({
  hasDefault,
  hasVietnamRule,
  hasUsRule,
  hasFallbackRule,
  adjustmentCount
}: {
  hasDefault: boolean;
  hasVietnamRule: boolean;
  hasUsRule: boolean;
  hasFallbackRule: boolean;
  adjustmentCount: number;
}) {
  const items = [
    {
      label: 'Default package type',
      ready: hasDefault,
      detail: hasDefault
        ? 'Products without a custom assignment have a fallback.'
        : 'Choose a default package type before relying on fallback shipping.'
    },
    {
      label: 'Vietnam shipping fee',
      ready: hasVietnamRule,
      detail: hasVietnamRule ? 'Vietnam checkout has a direct fee row.' : 'Add a VN row for domestic checkout.'
    },
    {
      label: 'United States shipping fee',
      ready: hasUsRule,
      detail: hasUsRule ? 'US checkout has a direct fee row.' : 'Add a US row for US customers.'
    },
    {
      label: 'Other countries fee',
      ready: hasFallbackRule,
      detail: hasFallbackRule
        ? 'Countries without direct rows can still receive a quote.'
        : 'Add Other countries so unsupported destinations do not surprise customers.'
    }
  ];
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_30px_rgba(92,48,26,0.05)] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shipping readiness</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            A quick check for the destinations customers are most likely to use.
          </p>
        </div>
        <span className="w-fit rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold tabular-nums">
          {readyCount}/4 ready
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid min-h-28 content-start gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-paper)] p-3"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2
                className={item.ready ? 'mt-0.5 size-4 text-[var(--success)]' : 'mt-0.5 size-4 text-[var(--muted-foreground)]'}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-semibold">{item.label}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        US state surcharges are optional. Current setup has{' '}
        <span className="font-semibold text-[var(--foreground)] tabular-nums">{adjustmentCount}</span>.
      </p>
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
  const title = currentDefaultName
    ? `"${profile.name}" will replace "${currentDefaultName}" as the fallback package type.`
    : `"${profile.name}" will be used for products without a custom assignment.`;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="secondary"
        className="min-h-10 px-3 text-sm"
        disabled={pending || !profile.active}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setStoreDefaultShippingProfileAction(profile.id);
            if (result.status === 'updated') {
              router.refresh();
              return;
            }
            setError('Default package type could not be changed.');
          });
        }}
        title={title}
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

  const adjustmentGroups = useMemo(() => {
    const groups = new Map<string, AdjustmentGroup>();
    for (const rule of rules) {
      for (const adjustment of rule.shipping_region_adjustments ?? []) {
        const key = [
          adjustment.shipping_rule_id,
          adjustment.mode,
          adjustment.first_item_fee_minor,
          adjustment.additional_item_fee_minor,
          adjustment.active
        ].join(':');
        const existing = groups.get(key);
        if (existing) {
          existing.codes.push(adjustment.region_code);
          continue;
        }
        groups.set(key, {
          key,
          profileName: rule.profileName,
          destinationLabel: destinationLabel(rule),
          currencyCode: rule.currency_code,
          codes: [adjustment.region_code],
          mode: adjustment.mode,
          firstItemFeeMinor: adjustment.first_item_fee_minor,
          additionalItemFeeMinor: adjustment.additional_item_fee_minor,
          active: adjustment.active
        });
      }
    }
    return Array.from(groups.values()).map((group) => ({
      ...group,
      codes: group.codes.sort((a, b) => a.localeCompare(b))
    }));
  }, [rules]);

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
          const aMeta = destinationMeta(a);
          const bMeta = destinationMeta(b);
          if (aMeta.priority !== bMeta.priority) {
            return aMeta.priority - bMeta.priority;
          }
          if (a.currency_code !== b.currency_code) {
            return a.currency_code.localeCompare(b.currency_code);
          }
          return aMeta.label.localeCompare(bMeta.label);
        }),
    [currency, rules]
  );

  const activeProfileOptions = profiles.map(({ active, id, name }) => ({ active, id, name }));
  const ruleOptions = rules.map((rule) => ({
    id: rule.id,
    label: `${rule.profileName} - ${destinationLabel(rule)} - ${rule.currency_code}`,
    currencyCode: rule.currency_code,
    countryCode: rule.country_code
  }));
  const assignmentTotal = profiles.reduce((total, profile) => total + profile.assignmentCount, 0);
  const hasVietnamRule = rules.some((rule) => rule.active && rule.country_code === 'VN');
  const hasUsRule = rules.some((rule) => rule.active && rule.country_code === 'US');
  const hasFallbackRule = rules.some((rule) => rule.active && rule.match_kind === 'fallback');

  return (
    <div className="grid gap-8">
      <ReadinessPanel
        hasDefault={Boolean(currentDefault)}
        hasVietnamRule={hasVietnamRule}
        hasUsRule={hasUsRule}
        hasFallbackRule={hasFallbackRule}
        adjustmentCount={adjustmentGroups.length}
      />

      <SectionSurface
        title="Shipping fees by destination"
        description="The rows customers actually hit at checkout."
        count={sortedRules.length}
        action={<ShippingRuleSheet profiles={activeProfileOptions} />}
      >
        <div className="grid gap-2 border-b border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_150px] sm:px-6">
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Package types stay behind the scenes. Start here when changing customer-facing shipping fees.
            </span>
          </div>
          <Select value={currency} onValueChange={(value) => setCurrency(value as typeof currency)}>
            <SelectTrigger aria-label="Filter destination fees by currency" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="VND">VND</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sortedRules.length === 0 ? (
          <AdminEmptyState
            icon={MapPin}
            title="No shipping fees for this currency."
            description="Add Vietnam, United States, or Other countries coverage."
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {sortedRules.map((rule) => {
              const meta = destinationMeta(rule);
              const regionCount = rule.shipping_region_adjustments?.length ?? 0;
              return (
              <article
                key={rule.id}
                className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(160px,0.8fr)_minmax(190px,1fr)_minmax(220px,1.15fr)_150px_110px] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{meta.label}</p>
                  <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                    {meta.detail}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{rule.profileName}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Package type</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {rule.currency_code}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {feeLabel(
                      rule.currency_code,
                      rule.first_item_fee_minor,
                      rule.additional_item_fee_minor
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">{regionCount}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">US state surcharges</p>
                </div>
                <div className="flex justify-start lg:justify-end">
                  <AdminStatusPill
                    tone={rule.active && rule.profileActive ? 'success' : 'default'}
                  >
                    {rule.active && rule.profileActive ? 'Active' : 'Inactive'}
                  </AdminStatusPill>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </SectionSurface>

      <SectionSurface
        title="Package types"
        description="Reusable package groups for products and variants."
        count={filteredProfiles.length}
      >
        <div className="grid gap-2 border-b border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_150px] sm:px-6">
          <label className="relative">
            <span className="sr-only">Search package types</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search package type or destination"
              className="min-h-10 pl-9 text-sm"
            />
          </label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger aria-label="Filter package types by status" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredProfiles.length === 0 ? (
          <AdminEmptyState
            icon={PackageCheck}
            title={profiles.length ? 'No package types match these filters.' : 'No package types yet.'}
            description={
              profiles.length
                ? 'Change the search or status filter.'
                : 'Add a package type before creating destination fees.'
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
                  <p className="text-sm text-[var(--muted-foreground)]">product assignments</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {(profile.shipping_rules ?? []).length}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">destination fees</p>
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
                        ? `"${profile.name}" is the default package type. Set another package type as default before deleting it.`
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
        title="US state surcharges"
        description="Optional surcharge or replacement fees layered on top of United States shipping."
        count={adjustmentGroups.length}
        action={<ShippingRegionAdjustmentSheet rules={ruleOptions} />}
      >
        {adjustmentGroups.length === 0 ? (
          <AdminEmptyState
            icon={ShieldCheck}
            title="No US state surcharges."
            description="Standard United States shipping applies to every state and territory."
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {adjustmentGroups.map((adjustment) => (
              <article
                key={adjustment.key}
                className="grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[110px_minmax(220px,1fr)_170px_minmax(230px,1fr)_110px] lg:items-center"
              >
                <div>
                  <p className="font-semibold">{summarizeCodes(adjustment.codes)}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">States/territories</p>
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
                    adjustment.firstItemFeeMinor,
                    adjustment.additionalItemFeeMinor
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

      <SectionSurface
        title="Product package assignments"
        description="Most products can use the default package type. Assign custom package types only when the parcel is meaningfully different."
        count={assignmentTotal}
      >
        <div className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Truck className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <p className="font-semibold">
                {assignmentTotal
                  ? `${assignmentTotal} custom product or variant assignments`
                  : 'No custom assignments'}
              </p>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Products and variants without a custom assignment use{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {currentDefault?.name ?? 'the default package type'}
              </span>
              .
            </p>
          </div>
          <Link
            href="/admin/catalog"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
          >
            Open catalog
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </SectionSurface>
    </div>
  );
}
