'use client';

import {useState, useTransition} from 'react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

const copy = {
  en: {
    label: 'Discount code',
    apply: 'Apply discount',
    remove: 'Remove discount',
    pending: 'Checking',
    applied: 'Discount applied',
    invalid: 'Discount could not be checked.',
    notEligible: 'This discount is not eligible for the current cart.'
  },
  vi: {
    label: 'Ma giam gia',
    apply: 'Ap dung ma giam gia',
    remove: 'Go ma giam gia',
    pending: 'Dang kiem tra',
    applied: 'Da ap dung ma giam gia',
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
  const appliedCode = acceptedQuote?.discount.status === 'applied' ? acceptedQuote.discount.code : null;

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
        destinationRegionCode: 'regionCode' in acceptedQuote.shipping ? acceptedQuote.shipping.regionCode ?? null : null,
        shippingQuoteVersion: 2,
        discountCode,
        priorAcceptedQuoteHash: acceptedQuote.hash
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
      {appliedCode ? (
        <p role="status" className="text-sm font-semibold text-[var(--success)]">
          {t.applied}: {appliedCode}
        </p>
      ) : null}
      <div className="grid gap-2">
        <label htmlFor="discount-code" className="font-semibold">
          {t.label}
        </label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            id="discount-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="uppercase"
          />
          <Button disabled={pending || !acceptedQuote || code.trim().length === 0} onClick={() => refresh(code.trim().toUpperCase())}>
            {pending ? t.pending : t.apply}
          </Button>
        </div>
      </div>
      {appliedCode ? (
        <div>
          <Button variant="ghost" disabled={pending || !acceptedQuote} onClick={() => refresh(null)} className="min-h-9 px-3 text-sm">
            {t.remove}
          </Button>
        </div>
      ) : null}
      {acceptedQuote?.discount.status === 'not_eligible' ? (
        <div>
          <Button variant="ghost" disabled={pending || !acceptedQuote} onClick={() => refresh(null)} className="min-h-9 px-3 text-sm">
            {t.remove}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
