'use client';

import {useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import {createTranslator} from 'next-intl';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export type DiscountApplyOutcome = {
  status: 'applied' | 'not_eligible' | 'failed';
  quoteHash: string | null;
};

type DiscountCodeFormProps = {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  pending: boolean;
  disabled?: boolean;
  idSuffix?: string;
  onApply: (code: string | null) => Promise<DiscountApplyOutcome>;
};

export function DiscountCodeForm({
  locale,
  acceptedQuote,
  pending,
  disabled = false,
  idSuffix = 'default',
  onApply
}: DiscountCodeFormProps) {
  const translate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.discount'
  });
  const t = {
    label: translate('label'), add: translate('add'), apply: translate('apply'), remove: translate('remove'),
    pending: translate('pending'), applied: translate('applied'), removed: translate('removed'),
    invalid: translate('invalid'), notEligible: translate('notEligible')
  };
  const [code, setCode] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<{kind: 'success' | 'error'; message: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);
  const appliedCode = acceptedQuote?.discount.status === 'applied' ? acceptedQuote.discount.code : null;
  const busy = disabled || pending || submitting;
  const fieldsId = `checkout-discount-fields-${idSuffix}`;
  const inputId = `discount-code-${idSuffix}`;

  async function submit(discountCode: string | null) {
    if (!acceptedQuote) {
      return;
    }
    const requestId = ++requestIdRef.current;
    setFeedback(null);
    setSubmitting(true);
    try {
      const outcome = await onApply(discountCode);
      if (requestId !== requestIdRef.current) return;
      if (outcome.status === 'failed') {
        setFeedback({kind: 'error', message: t.invalid});
        return;
      }
      if (outcome.status === 'not_eligible') {
        setCode('');
        setExpanded(false);
        setFeedback({kind: 'error', message: t.notEligible});
        return;
      }
      if (discountCode === null) {
        setCode('');
      }
      setExpanded(false);
      setFeedback({kind: 'success', message: discountCode === null ? t.removed : t.applied});
    } finally {
      if (requestId === requestIdRef.current) setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div role="status" aria-live="polite" aria-atomic="true" className="min-h-0">
        {feedback ? <Alert variant={feedback.kind === 'success' ? 'success' : 'warning'}>{feedback.message}</Alert> : null}
      </div>
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
                    setFeedback(null);
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
