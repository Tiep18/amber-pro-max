'use client';

import {useState, useTransition} from 'react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

const copy = {
  en: {
    label: 'Discount code',
    apply: 'Apply discount',
    remove: 'Remove discount',
    pending: 'Checking',
    invalid: 'Discount could not be checked.',
    notEligible: 'This discount is not eligible for the current cart.'
  },
  vi: {
    label: 'Ma giam gia',
    apply: 'Ap dung ma giam gia',
    remove: 'Go ma giam gia',
    pending: 'Dang kiem tra',
    invalid: 'Khong the kiem tra ma giam gia.',
    notEligible: 'Ma giam gia nay khong phu hop voi gio hang hien tai.'
  }
} as const;

type DiscountCodeFormProps = {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  onAcceptedQuote: (quote: CartQuote) => void;
};

function quoteLines(quote: CartQuote) {
  return quote.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.requestedQuantity,
    marketAtAdd: line.marketAtAdd,
    addedAt: quote.quotedAt,
    updatedAt: quote.quotedAt
  }));
}

export function DiscountCodeForm({locale, acceptedQuote, onAcceptedQuote}: DiscountCodeFormProps) {
  const t = copy[locale];
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh(discountCode: string | null) {
    if (!acceptedQuote) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await refreshCheckoutQuoteAction({
        locale,
        market: acceptedQuote.market,
        lines: quoteLines(acceptedQuote),
        destinationCountryCode:
          acceptedQuote.shipping.status === 'ready' || acceptedQuote.shipping.status === 'unsupported_destination'
            ? acceptedQuote.shipping.countryCode
            : null,
        discountCode,
        acceptedQuote
      });
      if (result.status !== 'success') {
        setError(t.invalid);
        return;
      }
      onAcceptedQuote(result.quote);
      if (result.quote.discount.status === 'not_eligible') {
        setError(t.notEligible);
      }
      if (discountCode === null) {
        setCode('');
      }
    });
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert variant="warning">{error}</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">{t.label}</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !acceptedQuote || code.trim().length === 0} onClick={() => refresh(code)}>
          {pending ? t.pending : t.apply}
        </Button>
        <Button variant="secondary" disabled={pending || !acceptedQuote || acceptedQuote.discount.status !== 'applied'} onClick={() => refresh(null)}>
          {t.remove}
        </Button>
      </div>
    </div>
  );
}
