'use client';

import {useEffect, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

const copy = {
  en: {
    label: 'Discount code',
    add: 'Add a discount code',
    apply: 'Apply discount',
    remove: 'Remove discount',
    pending: 'Checking',
    applied: 'Discount applied',
    invalid: 'Discount could not be checked.',
    notEligible: 'This discount is not eligible for the current cart.'
  },
  vi: {
    label: 'Mã giảm giá',
    add: 'Thêm mã giảm giá',
    apply: 'Áp dụng',
    remove: 'Gỡ mã',
    pending: 'Đang kiểm tra',
    applied: 'Đã áp dụng',
    invalid: 'Không thể kiểm tra mã giảm giá.',
    notEligible: 'Mã giảm giá này không áp dụng cho giỏ hàng hiện tại.'
  }
} as const;

export type DiscountApplyOutcome = {
  status: 'applied' | 'not_eligible' | 'failed';
  quoteHash: string | null;
};

type DiscountCodeFormProps = {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  feedbackRevision: number;
  pending: boolean;
  disabled?: boolean;
  idSuffix?: string;
  onApply: (code: string | null) => Promise<DiscountApplyOutcome>;
};

export function DiscountCodeForm({
  locale,
  acceptedQuote,
  feedbackRevision,
  pending,
  disabled = false,
  idSuffix = 'default',
  onApply
}: DiscountCodeFormProps) {
  const t = copy[locale];
  const [code, setCode] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<{message: string; quoteHash: string | null} | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const appliedCode = acceptedQuote?.discount.status === 'applied' ? acceptedQuote.discount.code : null;
  const busy = disabled || pending || submitting;
  const fieldsId = `checkout-discount-fields-${idSuffix}`;
  const inputId = `discount-code-${idSuffix}`;

  useEffect(() => {
    setError((current) =>
      current && current.quoteHash !== (acceptedQuote?.hash ?? null) ? null : current
    );
  }, [acceptedQuote?.hash]);

  useEffect(() => {
    setError(null);
  }, [feedbackRevision]);

  async function submit(discountCode: string | null) {
    if (!acceptedQuote) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await onApply(discountCode);
      if (outcome.status === 'failed') {
        setError({message: t.invalid, quoteHash: acceptedQuote.hash});
        return;
      }
      if (outcome.status === 'not_eligible') {
        setCode('');
        setExpanded(false);
        setError({message: t.notEligible, quoteHash: outcome.quoteHash});
        return;
      }
      if (discountCode === null) {
        setCode('');
      }
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      {error ? <Alert variant="warning">{error.message}</Alert> : null}
      {appliedCode ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[var(--success)]">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 break-words">{t.applied}: {appliedCode}</span>
          </span>
          <Button type="button" variant="ghost" disabled={busy || !acceptedQuote} onClick={() => void submit(null)} className="min-h-11 shrink-0 whitespace-normal px-2 text-sm">
            {t.remove}
          </Button>
        </div>
      ) : null}
      {!appliedCode ? (
        <>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={expanded}
            aria-controls={fieldsId}
            disabled={disabled}
            className="min-h-11 w-full justify-between px-0 text-sm font-semibold hover:bg-transparent"
            onClick={() => {
              setError(null);
              setExpanded((current) => !current);
            }}
          >
            {t.add}
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
          {expanded ? (
            <div id={fieldsId} className="grid gap-2">
              <label htmlFor={inputId} className="text-sm font-semibold">
                {t.label}
              </label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id={inputId}
                  value={code}
                  autoComplete="off"
                  disabled={disabled}
                  onChange={(event) => {
                    setError(null);
                    setCode(event.target.value);
                  }}
                  className="uppercase"
                />
                <Button type="button" variant="secondary" className="min-h-11 whitespace-normal" disabled={busy || !acceptedQuote || code.trim().length === 0} onClick={() => void submit(code.trim().toUpperCase())}>
                  {busy ? t.pending : t.apply}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
