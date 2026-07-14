'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  PackageCheck,
  Search,
  Truck
} from 'lucide-react';
import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { setStoreDefaultShippingProfileAction } from '@/checkout/admin-shipping-actions';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DeactivateShippingProfileButton } from './deactivate-shipping-profile-button';
import { ShippingProfileEditSheet } from './shipping-create-sheet';
import { ShippingRegionAdjustmentSheet, US_REGIONS } from './shipping-region-adjustment-sheet';
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

type StandardDestination = 'VN' | 'US' | 'fallback';

const destinationConfig: Record<StandardDestination, { label: string; currency: CurrencyCode }> = {
  VN: { label: 'Vietnam', currency: 'VND' },
  US: { label: 'United States', currency: 'USD' },
  fallback: { label: 'Other countries', currency: 'USD' }
};

const regionNames = new Map<string, string>(US_REGIONS.map(([code, name]) => [code, name]));

function destinationLabel(rule: Pick<AdminShippingRule, 'match_kind' | 'country_code'>) {
  if (rule.match_kind === 'fallback') return 'Other countries';
  if (rule.country_code === 'VN') return 'Vietnam';
  if (rule.country_code === 'US') return 'United States';
  return rule.country_code ?? 'Unknown destination';
}

function findStandardRule(profile: AdminShippingProfile, destination: StandardDestination) {
  const config = destinationConfig[destination];
  return (profile.shipping_rules ?? []).find((rule) => {
    const matchesDestination =
      destination === 'fallback'
        ? rule.match_kind === 'fallback'
        : rule.match_kind === 'exact_country' && rule.country_code === destination;
    return matchesDestination && rule.currency_code === config.currency;
  });
}

function formatRate(rule: AdminShippingRule) {
  const first = formatMoney({
    amountMinor: rule.first_item_fee_minor,
    currencyCode: rule.currency_code
  });
  const additional = formatMoney({
    amountMinor: rule.additional_item_fee_minor,
    currencyCode: rule.currency_code
  });
  return { first, additional };
}

function ReadinessBanner({ profiles }: { profiles: AdminShippingProfile[] }) {
  const defaultProfile = profiles.find((profile) => profile.isDefault);
  const operationalProfiles = profiles.filter(
    (profile) => profile.isDefault || profile.assignmentCount > 0
  );
  const blockers: string[] = [];

  if (!defaultProfile) blockers.push('Choose a default package type.');
  for (const profile of operationalProfiles) {
    if (!profile.active) {
      blockers.push(`${profile.name} is assigned or default, but inactive.`);
      continue;
    }
    for (const destination of ['VN', 'US', 'fallback'] as const) {
      const rule = findStandardRule(profile, destination);
      if (!rule?.active) {
        blockers.push(
          `${profile.name} needs an active ${destinationConfig[destination].label} rate.`
        );
      }
    }
  }

  if (!blockers.length) {
    return (
      <Alert className="border-[color:color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color:color-mix(in_srgb,var(--success)_7%,var(--surface))]">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-[var(--success)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Shipping setup is ready for checkout</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Every package type currently used by a product has Vietnam, United States, and
              fallback coverage.
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">
            {blockers.length} checkout readiness {blockers.length === 1 ? 'issue' : 'issues'}
          </p>
          <ul className="mt-2 grid gap-1 text-sm">
            {blockers.slice(0, 4).map((blocker) => (
              <li key={blocker}>• {blocker}</li>
            ))}
          </ul>
          {blockers.length > 4 ? (
            <p className="mt-1 text-sm">
              And {blockers.length - 4} more. Review the highlighted cells below.
            </p>
          ) : null}
        </div>
      </div>
    </Alert>
  );
}

function SetDefaultProfileButton({
  profile,
  currentDefault,
  assignmentTotal
}: {
  profile: AdminShippingProfile;
  currentDefault: AdminShippingProfile | null;
  assignmentTotal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setDefault() {
    setError(null);
    startTransition(async () => {
      const result = await setStoreDefaultShippingProfileAction(profile.id);
      if (result.status === 'updated') {
        setOpen(false);
        router.refresh();
        return;
      }
      setError('Default package type could not be changed.');
    });
  }

  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 px-3 text-sm"
        disabled={!profile.active || pending}
        onClick={() => setOpen(true)}
      >
        Set default
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={`Use “${profile.name}” as the default?`}
        description={
          <>
            {currentDefault ? (
              <>
                This replaces <strong>“{currentDefault.name}”</strong>.{' '}
              </>
            ) : null}
            Products and variants without a custom assignment will use this package type. There are
            currently <strong>{assignmentTotal} custom assignments</strong> that will not change.
          </>
        }
        confirmLabel="Set as default"
        pending={pending}
        onConfirm={setDefault}
      />
    </div>
  );
}

function RateCell({
  destination,
  profile,
  profiles
}: {
  destination: StandardDestination;
  profile: AdminShippingProfile;
  profiles: Array<{ id: string; name: string; active: boolean }>;
}) {
  const rule = findStandardRule(profile, destination);
  const config = destinationConfig[destination];

  if (!rule) {
    return (
      <div className="grid min-h-28 content-between gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--destructive)]/50 bg-[color:color-mix(in_srgb,var(--destructive)_4%,var(--surface))] p-3">
        <div>
          <p className="text-sm font-semibold text-[var(--destructive)]">Rate missing</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Checkout has no {config.currency} rate.
          </p>
        </div>
        <ShippingRuleSheet
          profiles={profiles}
          presetProfileId={profile.id}
          presetDestination={destination}
          triggerLabel={`Add ${config.label} rate`}
          triggerVariant="ghost"
        />
      </div>
    );
  }

  const rate = formatRate(rule);
  return (
    <div
      className={`grid min-h-28 content-between gap-3 rounded-[var(--radius-control)] border p-3 ${
        rule.active && profile.active
          ? 'border-[var(--border)] bg-[var(--surface-paper)]'
          : 'border-[var(--destructive)]/40 bg-[color:color-mix(in_srgb,var(--destructive)_4%,var(--surface))]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold tabular-nums">{rate.first}</p>
          <AdminStatusPill tone={rule.active && profile.active ? 'success' : 'default'}>
            {rule.active && profile.active ? 'Active' : 'Inactive'}
          </AdminStatusPill>
        </div>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] tabular-nums">
          + {rate.additional} each additional
        </p>
      </div>
      <ShippingRuleSheet
        profiles={profiles}
        rule={rule}
        triggerLabel="Edit rate"
        triggerVariant="ghost"
      />
    </div>
  );
}

function PackageDetails({
  profile,
  profiles,
  ruleOptions
}: {
  profile: AdminShippingProfile;
  profiles: Array<{ id: string; name: string; active: boolean }>;
  ruleOptions: Array<{
    id: string;
    label: string;
    currencyCode: CurrencyCode;
    countryCode: string | null;
  }>;
}) {
  const standardRuleIds = new Set(
    (['VN', 'US', 'fallback'] as const)
      .map((destination) => findStandardRule(profile, destination)?.id)
      .filter(Boolean)
  );
  const customRules = (profile.shipping_rules ?? []).filter(
    (rule) => !standardRuleIds.has(rule.id)
  );
  const usRule = findStandardRule(profile, 'US');
  const adjustments = usRule?.shipping_region_adjustments ?? [];

  return (
    <details className="group border-t border-[var(--border)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset sm:px-5">
        Advanced destinations and US state adjustments
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-6 border-t border-[var(--border)] bg-[var(--surface-paper)] px-4 py-5 sm:px-5 xl:grid-cols-2">
        <section aria-labelledby={`custom-${profile.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 id={`custom-${profile.id}`} className="font-semibold">
                Custom country rates
              </h4>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Only add these when a country differs from the fallback rate.
              </p>
            </div>
            <ShippingRuleSheet
              profiles={profiles}
              presetProfileId={profile.id}
              presetDestination="custom"
              triggerLabel="Add country"
            />
          </div>
          <div className="mt-4 grid gap-2">
            {customRules.length ? (
              customRules.map((rule) => {
                const rate = formatRate(rule);
                return (
                  <div
                    key={rule.id}
                    className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{destinationLabel(rule)}</p>
                        <AdminStatusPill tone={rule.active ? 'success' : 'default'}>
                          {rule.active ? 'Active' : 'Inactive'}
                        </AdminStatusPill>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)] tabular-nums">
                        {rate.first} first · +{rate.additional} additional
                      </p>
                    </div>
                    <ShippingRuleSheet
                      profiles={profiles}
                      rule={rule}
                      triggerLabel="Edit"
                      triggerVariant="ghost"
                    />
                  </div>
                );
              })
            ) : (
              <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
                No custom country rates.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby={`adjustments-${profile.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 id={`adjustments-${profile.id}`} className="font-semibold">
                US state adjustments
              </h4>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Optional surcharge or replacement for a specific state or territory.
              </p>
            </div>
            <ShippingRegionAdjustmentSheet
              rules={ruleOptions}
              presetRuleId={usRule?.id}
              triggerLabel="Add state"
            />
          </div>
          <div className="mt-4 grid gap-2">
            {adjustments.length ? (
              adjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {regionNames.get(adjustment.region_code) ?? adjustment.region_code} (
                        {adjustment.region_code})
                      </p>
                      <AdminStatusPill tone={adjustment.active ? 'success' : 'default'}>
                        {adjustment.active ? 'Active' : 'Inactive'}
                      </AdminStatusPill>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)] tabular-nums">
                      {adjustment.mode === 'surcharge' ? 'Add' : 'Replace with'}{' '}
                      {formatMoney({
                        amountMinor: adjustment.first_item_fee_minor,
                        currencyCode: 'USD'
                      })}{' '}
                      first ·{' '}
                      {formatMoney({
                        amountMinor: adjustment.additional_item_fee_minor,
                        currencyCode: 'USD'
                      })}{' '}
                      additional
                    </p>
                  </div>
                  <ShippingRegionAdjustmentSheet
                    rules={ruleOptions}
                    adjustment={adjustment}
                    triggerLabel="Edit"
                  />
                </div>
              ))
            ) : (
              <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
                No state-specific adjustments. The base US rate applies everywhere.
              </p>
            )}
          </div>
        </section>
      </div>
    </details>
  );
}

export function ShippingManagement({ profiles }: { profiles: AdminShippingProfile[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const currentDefault = profiles.find((profile) => profile.isDefault) ?? null;
  const assignmentTotal = profiles.reduce((total, profile) => total + profile.assignmentCount, 0);
  const profileOptions = profiles.map(({ active, id, name }) => ({ active, id, name }));
  const ruleOptions = profiles.flatMap((profile) =>
    (profile.shipping_rules ?? []).map((rule) => ({
      id: rule.id,
      label: `${profile.name} — ${destinationLabel(rule)} — ${rule.currency_code}`,
      currencyCode: rule.currency_code,
      countryCode: rule.country_code
    }))
  );

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesStatus =
        status === 'all' || (status === 'active' ? profile.active : !profile.active);
      const matchesQuery =
        !normalized ||
        profile.name.toLowerCase().includes(normalized) ||
        (profile.description ?? '').toLowerCase().includes(normalized) ||
        (profile.shipping_rules ?? []).some((rule) =>
          destinationLabel(rule).toLowerCase().includes(normalized)
        );
      return matchesStatus && matchesQuery;
    });
  }, [profiles, query, status]);

  return (
    <div className="grid gap-6">
      <ReadinessBanner profiles={profiles} />

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Package rates</h2>
              <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
                {profiles.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Manage each package and its checkout rates in one place.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px]">
            <label className="relative">
              <span className="sr-only">Search package types</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search packages or destinations"
                className="min-h-11 pl-9 text-sm"
              />
            </label>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger
                aria-label="Filter package types by status"
                className="h-11 min-h-11 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredProfiles.length ? (
          <div className="divide-y divide-[var(--border)]">
            {filteredProfiles.map((profile) => (
              <article key={profile.id}>
                <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(190px,0.8fr)_repeat(3,minmax(190px,1fr))]">
                  <div className="flex min-h-28 flex-col justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{profile.name}</h3>
                        {profile.isDefault ? (
                          <AdminStatusPill tone="success">Default</AdminStatusPill>
                        ) : null}
                        <AdminStatusPill tone={profile.active ? 'success' : 'default'}>
                          {profile.active ? 'Active' : 'Inactive'}
                        </AdminStatusPill>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                        {profile.description || 'No internal description'}
                      </p>
                      <Link
                        href="/admin/catalog"
                        className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                      >
                        {profile.assignmentCount} custom assignment
                        {profile.assignmentCount === 1 ? '' : 's'}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                    <details className="group/actions relative">
                      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                        Package actions
                        <ChevronDown
                          className="size-4 transition-transform group-open/actions:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ShippingProfileEditSheet profile={profile} />
                        {!profile.isDefault ? (
                          <SetDefaultProfileButton
                            profile={profile}
                            currentDefault={currentDefault}
                            assignmentTotal={assignmentTotal}
                          />
                        ) : null}
                        <DeactivateShippingProfileButton
                          profileId={profile.id}
                          profileName={profile.name}
                          active={profile.active}
                          assignmentCount={profile.assignmentCount}
                          blockedReason={
                            profile.isDefault && profile.active
                              ? 'Set another package type as default before deactivating this one.'
                              : undefined
                          }
                        />
                      </div>
                    </details>
                  </div>
                  {(['VN', 'US', 'fallback'] as const).map((destination) => (
                    <div key={destination}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                          {destinationConfig[destination].label}
                        </p>
                        {destination === 'US' ? (
                          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
                            {findStandardRule(profile, 'US')?.shipping_region_adjustments?.length ??
                              0}{' '}
                            state rules
                          </span>
                        ) : null}
                      </div>
                      <RateCell
                        destination={destination}
                        profile={profile}
                        profiles={profileOptions}
                      />
                    </div>
                  ))}
                </div>
                <PackageDetails
                  profile={profile}
                  profiles={profileOptions}
                  ruleOptions={ruleOptions}
                />
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={profiles.length ? Search : PackageCheck}
            title={
              profiles.length ? 'No package types match these filters.' : 'No package types yet.'
            }
            description={
              profiles.length
                ? 'Change the search or status filter.'
                : 'Create a package type, then add its destination rates.'
            }
          />
        )}
      </section>

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <div>
            <p className="font-semibold">Product package assignments</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {assignmentTotal} custom product or variant assignment
              {assignmentTotal === 1 ? '' : 's'}. Unassigned items use{' '}
              <strong className="text-[var(--foreground)]">
                {currentDefault?.name ?? 'no default package yet'}
              </strong>
              .
            </p>
          </div>
        </div>
        <Link
          href="/admin/catalog"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)]"
        >
          Open catalog
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
