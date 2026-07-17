'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { saveShippingRuleAction } from '@/checkout/admin-shipping-actions';
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
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type ProfileOption = { id: string; name: string; active: boolean };
export type ShippingRuleDraft = {
  id: string;
  profile_id: string;
  match_kind: 'exact_country' | 'fallback';
  country_code: string | null;
  currency_code: 'USD' | 'VND';
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
};
type DestinationChoice = 'VN' | 'US' | 'fallback' | 'custom';

const destinationChoices: Array<{
  value: DestinationChoice;
  label: string;
  description: string;
}> = [
  { value: 'VN', label: 'Vietnam', description: 'Domestic shipping, normally charged in VND.' },
  {
    value: 'US',
    label: 'United States',
    description: 'International checkout shipping, normally charged in USD.'
  },
  {
    value: 'fallback',
    label: 'Other countries',
    description: 'Used when this package has no dedicated country rate.'
  },
  { value: 'custom', label: 'Custom country', description: 'Use an ISO 2-letter country code.' }
];

function displayAmount(minor: number, currency: 'USD' | 'VND') {
  return currency === 'USD' ? (minor / 100).toFixed(2) : String(minor);
}

function initialDestination(
  rule?: ShippingRuleDraft,
  preset?: DestinationChoice
): DestinationChoice {
  if (!rule) return preset ?? 'US';
  if (rule.match_kind === 'fallback') return 'fallback';
  if (rule.country_code === 'VN' || rule.country_code === 'US') return rule.country_code;
  return 'custom';
}

function FieldError({ children }: { children?: string }) {
  return children ? (
    <span role="alert" className="text-sm font-medium text-[var(--destructive)]">
      {children}
    </span>
  ) : null;
}

function ContextField({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)]/55 px-3 py-2.5">
        <p className="font-semibold">{value}</p>
        {detail ? <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{detail}</p> : null}
      </div>
    </div>
  );
}

export function ShippingRuleSheet({
  profiles,
  rule,
  presetDestination,
  presetProfileId,
  triggerLabel,
  triggerVariant = 'secondary'
}: {
  profiles: ProfileOption[];
  rule?: ShippingRuleDraft;
  presetDestination?: DestinationChoice;
  presetProfileId?: string;
  triggerLabel?: string;
  triggerVariant?: 'primary' | 'secondary' | 'ghost';
}) {
  const router = useRouter();
  const countryRef = useRef<HTMLInputElement>(null);
  const firstFeeRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [destinationChoice, setDestinationChoice] = useState<DestinationChoice>(() =>
    initialDestination(rule, presetDestination)
  );
  const [profileId, setProfileId] = useState(rule?.profile_id ?? presetProfileId ?? '');
  const [currency, setCurrency] = useState<'USD' | 'VND'>(
    rule?.currency_code ?? (presetDestination === 'VN' ? 'VND' : 'USD')
  );
  const [countryCode, setCountryCode] = useState(rule?.country_code ?? '');
  const [firstItemFee, setFirstItemFee] = useState(
    rule ? displayAmount(rule.first_item_fee_minor, rule.currency_code) : ''
  );
  const [additionalItemFee, setAdditionalItemFee] = useState(
    rule ? displayAmount(rule.additional_item_fee_minor, rule.currency_code) : ''
  );
  const [active, setActive] = useState(rule?.active ?? true);
  const [errors, setErrors] = useState<
    Partial<Record<'profile' | 'country' | 'first' | 'additional', string>>
  >({});
  const [pending, startTransition] = useTransition();
  const editing = Boolean(rule);
  const profileLocked = Boolean(rule || presetProfileId);
  const destinationLocked = Boolean(rule || presetDestination);
  const currencyLocked = Boolean(rule || (presetDestination && presetDestination !== 'custom'));
  const activeProfiles = profiles.filter(
    (profile) => profile.active || profile.id === rule?.profile_id
  );
  const mode = destinationChoice === 'fallback' ? 'fallback' : 'exact_country';
  const label = triggerLabel ?? (editing ? 'Edit rate' : 'Add shipping fee');
  const destinationDescription = useMemo(
    () => destinationChoices.find((choice) => choice.value === destinationChoice)?.description,
    [destinationChoice]
  );
  const selectedProfileName =
    profiles.find((profile) => profile.id === profileId)?.name ?? 'Unknown package';
  const selectedDestinationLabel =
    destinationChoices.find((choice) => choice.value === destinationChoice)?.label ??
    'Unknown destination';

  function markDirty() {
    setDirty(true);
  }

  function amountToMinor(value: string) {
    const parsed = Number(value.replaceAll(',', '').trim());
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed * (currency === 'USD' ? 100 : 1));
  }

  function validate() {
    const next: typeof errors = {};
    if (!profileId) next.profile = 'Choose a package type.';
    if (destinationChoice === 'custom' && !/^[A-Z]{2}$/.test(countryCode.trim().toUpperCase())) {
      next.country = 'Enter a valid 2-letter country code.';
    }
    if (amountToMinor(firstItemFee) === null) next.first = 'Enter a zero or positive amount.';
    if (amountToMinor(additionalItemFee) === null)
      next.additional = 'Enter a zero or positive amount.';
    setErrors(next);
    if (next.country) countryRef.current?.focus();
    else if (next.first) firstFeeRef.current?.focus();
    return Object.keys(next).length === 0;
  }

  function resetDraft() {
    const choice = initialDestination(rule, presetDestination);
    setDestinationChoice(choice);
    setProfileId(rule?.profile_id ?? presetProfileId ?? '');
    setCurrency(rule?.currency_code ?? (choice === 'VN' ? 'VND' : 'USD'));
    setCountryCode(rule?.country_code ?? '');
    setFirstItemFee(rule ? displayAmount(rule.first_item_fee_minor, rule.currency_code) : '');
    setAdditionalItemFee(
      rule ? displayAmount(rule.additional_item_fee_minor, rule.currency_code) : ''
    );
    setActive(rule?.active ?? true);
    setErrors({});
    setDirty(false);
  }

  function requestOpen(nextOpen: boolean) {
    if (nextOpen) {
      resetDraft();
      setOpen(true);
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className="min-h-11 gap-2 px-3 text-sm"
        disabled={!activeProfiles.length}
        onClick={() => requestOpen(true)}
      >
        {editing ? (
          <Pencil className="size-4" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {label}
      </Button>
      <Sheet
        open={open}
        onOpenChange={requestOpen}
        showTrigger={false}
        triggerLabel={label}
        title={editing ? 'Edit shipping rate' : 'Add shipping rate'}
        closeLabel="Close shipping rate form"
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
      >
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate()) {
              toast.error('Review the highlighted shipping rate fields.');
              return;
            }
            const normalizedCountry =
              destinationChoice === 'custom'
                ? countryCode.trim().toUpperCase()
                : destinationChoice === 'fallback'
                  ? null
                  : destinationChoice;
            startTransition(async () => {
              const action = await saveShippingRuleAction({
                ruleId: rule?.id,
                profileId,
                destinationKind: mode,
                countryCode: normalizedCountry,
                currencyCode: currency,
                firstItemFeeMinor: amountToMinor(firstItemFee)!,
                additionalItemFeeMinor: amountToMinor(additionalItemFee)!,
                active
              });
              if (action.status === 'saved' || action.status === 'updated') {
                toast.success(
                  action.status === 'saved' ? 'Shipping rate created.' : 'Shipping rate updated.'
                );
                setDirty(false);
                setOpen(false);
                router.refresh();
                return;
              }
              toast.error(
                action.status === 'invalid'
                  ? 'This package already has that destination and currency, or a field is invalid. Edit the existing rate instead.'
                  : 'The shipping rate could not be saved. Try again.'
              );
            });
          }}
        >
          {profileLocked ? (
            <ContextField label="Package type" value={selectedProfileName} />
          ) : (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">Package type</span>
              <Select
                value={profileId}
                onValueChange={(value) => {
                  setProfileId(value);
                  setErrors((current) => ({ ...current, profile: undefined }));
                  markDirty();
                }}
              >
                <SelectTrigger aria-label="Package type" aria-invalid={Boolean(errors.profile)}>
                  <SelectValue placeholder="Choose a package type…" />
                </SelectTrigger>
                <SelectContent>
                  {activeProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.profile}</FieldError>
            </div>
          )}

          {destinationLocked ? (
            <ContextField
              label="Shipping destination"
              value={
                destinationChoice === 'custom' && countryCode
                  ? `${selectedDestinationLabel} · ${countryCode}`
                  : selectedDestinationLabel
              }
              detail={destinationDescription}
            />
          ) : (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">Shipping destination</span>
              <Select
                value={destinationChoice}
                onValueChange={(value) => {
                  const next = value as DestinationChoice;
                  setDestinationChoice(next);
                  if (next === 'VN') setCurrency('VND');
                  if (next === 'US' || next === 'fallback') setCurrency('USD');
                  setErrors((current) => ({ ...current, country: undefined }));
                  markDirty();
                }}
              >
                <SelectTrigger aria-label="Shipping destination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {destinationChoices.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-[var(--muted-foreground)]">{destinationDescription}</p>
            </div>
          )}

          {destinationChoice === 'custom' && !editing ? (
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">Country code</span>
              <Input
                ref={countryRef}
                value={countryCode}
                maxLength={2}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(errors.country)}
                className={cn('uppercase', errors.country && 'border-[var(--destructive)]')}
                onChange={(event) => {
                  setCountryCode(event.target.value.toUpperCase());
                  setErrors((current) => ({ ...current, country: undefined }));
                  markDirty();
                }}
                placeholder="JP…"
              />
              <FieldError>{errors.country}</FieldError>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            {currencyLocked ? (
              <ContextField label="Currency" value={currency} />
            ) : (
              <div className="grid gap-1.5">
                <span className="text-sm font-semibold">Currency</span>
                <Select
                  value={currency}
                  onValueChange={(value) => {
                    setCurrency(value as typeof currency);
                    markDirty();
                  }}
                >
                  <SelectTrigger aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VND">VND</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <label className="grid gap-1.5">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                First item fee
                <span className="text-xs font-normal text-[var(--muted-foreground)]">
                  {currency}
                </span>
              </span>
              <Input
                ref={firstFeeRef}
                value={firstItemFee}
                inputMode="decimal"
                aria-invalid={Boolean(errors.first)}
                className={cn(errors.first && 'border-[var(--destructive)]')}
                onChange={(event) => {
                  setFirstItemFee(event.target.value);
                  setErrors((current) => ({ ...current, first: undefined }));
                  markDirty();
                }}
                placeholder={currency === 'USD' ? '8.00…' : '35000…'}
              />
              <FieldError>{errors.first}</FieldError>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
              Each additional item
              <span className="text-xs font-normal text-[var(--muted-foreground)]">{currency}</span>
            </span>
            <Input
              value={additionalItemFee}
              inputMode="decimal"
              aria-invalid={Boolean(errors.additional)}
              className={cn(errors.additional && 'border-[var(--destructive)]')}
              onChange={(event) => {
                setAdditionalItemFee(event.target.value);
                setErrors((current) => ({ ...current, additional: undefined }));
                markDirty();
              }}
              placeholder={currency === 'USD' ? '2.00…' : '10000…'}
            />
            <FieldError>{errors.additional}</FieldError>
          </label>

          {editing ? (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">Rate availability</span>
              <Select
                value={active ? 'active' : 'inactive'}
                onValueChange={(value) => {
                  setActive(value === 'active');
                  markDirty();
                }}
              >
                <SelectTrigger aria-label="Shipping rate availability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active at checkout</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending
              ? 'Saving shipping rate…'
              : editing
                ? 'Save shipping rate'
                : 'Create shipping rate'}
          </Button>
        </form>
      </Sheet>
      <ConfirmationDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard shipping rate changes?"
        description="This rate has unsaved changes. Closing now will discard them."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          setDirty(false);
          setOpen(false);
        }}
      />
    </>
  );
}
