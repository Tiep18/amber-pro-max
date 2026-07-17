'use client';

import { type FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeDollarSign, Loader2, Percent, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createDiscountCodeAction } from '@/checkout/admin-discount-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type DiscountType = 'percentage' | 'fixed';
type Market = 'all' | 'vn' | 'intl';
type FieldErrors = Partial<Record<'code' | 'percentage' | 'amount' | 'usageLimit', string>>;

function FieldError({ error }: { error?: string }) {
  return error ? (
    <span role="alert" className="text-xs font-semibold text-[var(--destructive)]">
      {error}
    </span>
  ) : null;
}

export function DiscountCodeForm({
  onCreated
}: {
  onCreated?: (discount: { id: string; code: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [market, setMarket] = useState<Market>('all');
  const [currencyCode, setCurrencyCode] = useState<'USD' | 'VND'>('USD');
  const [code, setCode] = useState('');
  const [percentage, setPercentage] = useState('');
  const [amount, setAmount] = useState('');
  const [minimumSubtotal, setMinimumSubtotal] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const minimumCurrency = discountType === 'fixed' ? currencyCode : market === 'vn' ? 'VND' : 'USD';
  const preview = useMemo(() => {
    const offer =
      discountType === 'percentage'
        ? percentage
          ? `${percentage}% off`
          : 'Percentage discount'
        : amount
          ? `${currencyCode} ${amount} off`
          : `Fixed ${currencyCode} discount`;
    const audience =
      market === 'vn'
        ? 'Vietnam'
        : market === 'intl'
          ? 'International'
          : discountType === 'fixed'
            ? `All ${currencyCode} checkouts`
            : 'All markets';
    const minimum = minimumSubtotal
      ? `Minimum ${minimumCurrency} ${minimumSubtotal}`
      : 'No minimum';
    const limit = usageLimit ? `${usageLimit} redemptions` : 'Unlimited uses';
    return { offer, audience, minimum, limit };
  }, [
    amount,
    currencyCode,
    discountType,
    market,
    minimumCurrency,
    minimumSubtotal,
    percentage,
    usageLimit
  ]);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (code.trim().length < 2) next.code = 'Use at least 2 characters.';
    if (discountType === 'percentage') {
      const value = Number(percentage);
      if (!Number.isFinite(value) || value <= 0 || value > 100) {
        next.percentage = 'Enter a percentage from 0.01 to 100.';
      }
    } else {
      const value = Number(amount.replaceAll(',', ''));
      if (!Number.isFinite(value) || value <= 0) next.amount = 'Enter an amount greater than zero.';
    }
    if (usageLimit) {
      const value = Number(usageLimit);
      if (!Number.isInteger(value) || value <= 0) next.usageLimit = 'Use a positive whole number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Review the highlighted discount fields.');
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const actionResult = await createDiscountCodeAction(formData);
      if (actionResult.status === 'created') {
        toast.success('Discount code created.');
        const createdCode = code;
        form.reset();
        setCode('');
        setPercentage('');
        setAmount('');
        setMinimumSubtotal('');
        setUsageLimit('');
        router.refresh();
        if (onCreated) {
          onCreated({ id: actionResult.discountId, code: createdCode });
        }
      } else if (actionResult.status === 'invalid') {
        toast.error('Review the highlighted discount fields.');
      } else {
        toast.error('Discount code could not be created.');
      }
    });
  };

  return (
    <form className="grid gap-5" noValidate onSubmit={submit}>
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="flex items-center justify-between text-sm font-semibold">
            Code <span className="text-xs text-[var(--muted-foreground)]">Required</span>
          </span>
          <Input
            name="code"
            value={code}
            maxLength={40}
            autoComplete="off"
            aria-invalid={Boolean(errors.code)}
            className={cn('font-semibold uppercase', errors.code && 'border-[var(--destructive)]')}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase().replace(/\s+/g, ''));
              clearError('code');
            }}
            placeholder="SPRING15"
          />
          <FieldError error={errors.code} />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Internal note</span>
          <Textarea
            name="description"
            maxLength={500}
            rows={2}
            className="min-h-20"
            placeholder="Why and when this promotion is used"
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Discount type</legend>
        <input type="hidden" name="discountType" value={discountType} />
        <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1">
          {[
            { value: 'percentage' as const, label: 'Percentage', icon: Percent },
            { value: 'fixed' as const, label: 'Fixed amount', icon: BadgeDollarSign }
          ].map((option) => {
            const Icon = option.icon;
            const selected = discountType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDiscountType(option.value);
                  if (option.value === 'percentage' && market === 'all') {
                    setMinimumSubtotal('');
                  }
                  setErrors({});
                }}
                className={cn(
                  'flex min-h-10 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-3px)] px-3 text-sm font-semibold transition-colors',
                  selected
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {discountType === 'percentage' ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">Percentage</span>
            <div className="relative">
              <Input
                name="percentage"
                value={percentage}
                inputMode="decimal"
                aria-invalid={Boolean(errors.percentage)}
                className={cn('pr-9', errors.percentage && 'border-[var(--destructive)]')}
                onChange={(event) => {
                  setPercentage(event.target.value);
                  clearError('percentage');
                }}
                placeholder="10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
                %
              </span>
            </div>
            <FieldError error={errors.percentage} />
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">Fixed amount</span>
            <Input
              name="amount"
              value={amount}
              inputMode="decimal"
              aria-invalid={Boolean(errors.amount)}
              className={cn(errors.amount && 'border-[var(--destructive)]')}
              onChange={(event) => {
                setAmount(event.target.value);
                clearError('amount');
              }}
              placeholder={currencyCode === 'USD' ? '10.00' : '100000'}
            />
            <FieldError error={errors.amount} />
          </label>
        )}

        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Market</span>
          <Select
            name="market"
            value={market}
            onValueChange={(value) => {
              const next = value as Market;
              setMarket(next);
              if (next === 'vn') setCurrencyCode('VND');
              if (next === 'intl') setCurrencyCode('USD');
              if (discountType === 'percentage' && next === 'all') setMinimumSubtotal('');
            }}
          >
            <SelectTrigger aria-label="Market">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All markets</SelectItem>
              <SelectItem value="vn">Vietnam</SelectItem>
              <SelectItem value="intl">International</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {discountType === 'fixed' ? (
          <div className="grid gap-1.5">
            <span className="text-sm font-semibold">Currency</span>
            <Select
              name="currencyCode"
              value={currencyCode}
              onValueChange={(value) => setCurrencyCode(value as 'USD' | 'VND')}
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
        ) : (
          <input type="hidden" name="currencyCode" value={currencyCode} />
        )}
        <label className="grid gap-1.5">
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">
            Minimum subtotal
            <span className="text-xs font-normal text-[var(--muted-foreground)]">
              {minimumCurrency}
            </span>
          </span>
          <Input
            name="minimumSubtotal"
            value={minimumSubtotal}
            inputMode="decimal"
            disabled={discountType === 'percentage' && market === 'all'}
            onChange={(event) => setMinimumSubtotal(event.target.value)}
            placeholder={
              discountType === 'percentage' && market === 'all'
                ? 'Choose one market to set a minimum'
                : '0'
            }
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          Usage limit
          <span className="text-xs font-normal text-[var(--muted-foreground)]">Optional</span>
        </span>
        <Input
          name="usageLimit"
          value={usageLimit}
          inputMode="numeric"
          aria-invalid={Boolean(errors.usageLimit)}
          className={cn(errors.usageLimit && 'border-[var(--destructive)]')}
          onChange={(event) => {
            setUsageLimit(event.target.value);
            clearError('usageLimit');
          }}
          placeholder="Unlimited"
        />
        <FieldError error={errors.usageLimit} />
      </label>

      <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/65 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--muted-foreground)]">Preview</span>
          <strong>{preview.offer}</strong>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
          <span>{preview.audience}</span>
          <span aria-hidden="true">/</span>
          <span>{preview.minimum}</span>
          <span aria-hidden="true">/</span>
          <span>{preview.limit}</span>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full gap-2">
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {pending ? 'Creating...' : 'Create discount'}
      </Button>
    </form>
  );
}
