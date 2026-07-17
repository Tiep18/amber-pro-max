'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { saveShippingRegionAdjustmentAction } from '@/checkout/admin-shipping-actions';
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

export const US_REGIONS = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AS', 'American Samoa'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['GU', 'Guam'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MH', 'Marshall Islands'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['FM', 'Micronesia'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['MP', 'Northern Mariana Islands'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PW', 'Palau'],
  ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VI', 'Virgin Islands'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming']
] as const;

type RuleOption = {
  id: string;
  label: string;
  currencyCode: 'USD' | 'VND';
  countryCode: string | null;
};

export type ShippingRegionAdjustmentDraft = {
  id: string;
  shipping_rule_id: string;
  country_code: string;
  region_code: string;
  mode: 'surcharge' | 'replace';
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
};

function FieldError({ children }: { children?: string }) {
  return children ? (
    <span role="alert" className="text-sm font-medium text-[var(--destructive)]">
      {children}
    </span>
  ) : null;
}

export function ShippingRegionAdjustmentSheet({
  rules,
  adjustment,
  presetRuleId,
  triggerLabel
}: {
  rules: RuleOption[];
  adjustment?: ShippingRegionAdjustmentDraft;
  presetRuleId?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const firstFeeRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [ruleId, setRuleId] = useState(adjustment?.shipping_rule_id ?? presetRuleId ?? '');
  const [regionCode, setRegionCode] = useState(adjustment?.region_code ?? '');
  const [mode, setMode] = useState<'surcharge' | 'replace'>(adjustment?.mode ?? 'surcharge');
  const [firstItemFee, setFirstItemFee] = useState(
    adjustment ? (adjustment.first_item_fee_minor / 100).toFixed(2) : ''
  );
  const [additionalItemFee, setAdditionalItemFee] = useState(
    adjustment ? (adjustment.additional_item_fee_minor / 100).toFixed(2) : ''
  );
  const [active, setActive] = useState(adjustment?.active ?? true);
  const [errors, setErrors] = useState<
    Partial<Record<'rule' | 'region' | 'first' | 'additional', string>>
  >({});
  const [pending, startTransition] = useTransition();
  const editing = Boolean(adjustment);
  const eligibleRules = rules.filter(
    (rule) => rule.currencyCode === 'USD' && rule.countryCode === 'US'
  );
  const ruleLocked = Boolean(adjustment || presetRuleId);
  const selectedRuleLabel =
    eligibleRules.find((rule) => rule.id === ruleId)?.label ?? 'Unknown US rate';
  const label = triggerLabel ?? (editing ? 'Edit surcharge' : 'Add US surcharge');

  function markDirty() {
    setDirty(true);
  }

  function fee(value: string) {
    const parsed = Number(value.replaceAll(',', '').trim());
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
  }

  function validate() {
    const next: typeof errors = {};
    if (!ruleId) next.rule = 'Choose the United States rate this adjustment changes.';
    if (!regionCode) next.region = 'Choose a state or territory.';
    if (fee(firstItemFee) === null) next.first = 'Enter a zero or positive USD amount.';
    if (fee(additionalItemFee) === null) next.additional = 'Enter a zero or positive USD amount.';
    setErrors(next);
    if (next.first) firstFeeRef.current?.focus();
    return Object.keys(next).length === 0;
  }

  function resetDraft() {
    setRuleId(adjustment?.shipping_rule_id ?? presetRuleId ?? '');
    setRegionCode(adjustment?.region_code ?? '');
    setMode(adjustment?.mode ?? 'surcharge');
    setFirstItemFee(adjustment ? (adjustment.first_item_fee_minor / 100).toFixed(2) : '');
    setAdditionalItemFee(adjustment ? (adjustment.additional_item_fee_minor / 100).toFixed(2) : '');
    setActive(adjustment?.active ?? true);
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
        variant="secondary"
        className="min-h-11 gap-2 px-3 text-sm"
        disabled={!eligibleRules.length}
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
        title={editing ? 'Edit US state adjustment' : 'Add US state adjustment'}
        closeLabel="Close US adjustment form"
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
      >
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate()) {
              toast.error('Review the highlighted US adjustment fields.');
              return;
            }
            startTransition(async () => {
              const result = await saveShippingRegionAdjustmentAction({
                adjustmentId: adjustment?.id,
                shippingRuleId: ruleId,
                countryCode: 'US',
                regionCode,
                mode,
                firstItemFeeMinor: fee(firstItemFee)!,
                additionalItemFeeMinor: fee(additionalItemFee)!,
                active
              });
              if (result.status === 'saved' || result.status === 'updated') {
                toast.success(
                  result.status === 'saved'
                    ? 'State shipping adjustment created.'
                    : 'State shipping adjustment updated.'
                );
                setDirty(false);
                setOpen(false);
                router.refresh();
                return;
              }
              toast.error(
                result.status === 'invalid'
                  ? 'That state already has an active adjustment for this rate, or a field is invalid.'
                  : 'The US adjustment could not be saved. Try again.'
              );
            });
          }}
        >
          {ruleLocked ? (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">United States shipping rate</span>
              <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)]/55 px-3 py-2.5">
                <p className="font-semibold text-[var(--foreground)]">{selectedRuleLabel}</p>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  This adjustment stays attached to the selected package rate.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">United States shipping rate</span>
              <Select
                value={ruleId}
                onValueChange={(value) => {
                  setRuleId(value);
                  setErrors((current) => ({ ...current, rule: undefined }));
                  markDirty();
                }}
              >
                <SelectTrigger
                  aria-label="United States shipping rate"
                  aria-invalid={Boolean(errors.rule)}
                >
                  <SelectValue placeholder="Choose a US rate…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleRules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.rule}</FieldError>
            </div>
          )}

          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">State or territory</span>
            <Select
              value={regionCode}
              onValueChange={(value) => {
                setRegionCode(value);
                setErrors((current) => ({ ...current, region: undefined }));
                markDirty();
              }}
            >
              <SelectTrigger aria-label="State or territory" aria-invalid={Boolean(errors.region)}>
                <SelectValue placeholder="Choose a state or territory…" />
              </SelectTrigger>
              <SelectContent>
                {US_REGIONS.map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.region}</FieldError>
          </div>

          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">Adjustment type</span>
            <Select
              value={mode}
              onValueChange={(value) => {
                setMode(value as typeof mode);
                markDirty();
              }}
            >
              <SelectTrigger aria-label="Adjustment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surcharge">Add to the base rate</SelectItem>
                <SelectItem value="replace">Replace the base rate</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-[var(--muted-foreground)]">
              {mode === 'surcharge'
                ? 'These amounts are added to the selected US rate.'
                : 'These amounts completely replace the selected US rate.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                First item{' '}
                <span className="text-xs font-normal text-[var(--muted-foreground)]">USD</span>
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
                placeholder="1.25…"
              />
              <FieldError>{errors.first}</FieldError>
            </label>
            <label className="grid gap-1.5">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                Each additional{' '}
                <span className="text-xs font-normal text-[var(--muted-foreground)]">USD</span>
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
                placeholder="0.50…"
              />
              <FieldError>{errors.additional}</FieldError>
            </label>
          </div>

          {editing ? (
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">Adjustment availability</span>
              <Select
                value={active ? 'active' : 'inactive'}
                onValueChange={(value) => {
                  setActive(value === 'active');
                  markDirty();
                }}
              >
                <SelectTrigger aria-label="Adjustment availability">
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
              ? 'Saving US adjustment…'
              : editing
                ? 'Save US adjustment'
                : 'Create US adjustment'}
          </Button>
        </form>
      </Sheet>
      <ConfirmationDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard US adjustment changes?"
        description="This adjustment has unsaved changes. Closing now will discard them."
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
