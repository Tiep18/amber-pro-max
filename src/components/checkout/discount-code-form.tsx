'use client';

import {useState, useTransition} from 'react';
import {Check, ChevronDown} from 'lucide-react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
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
  const [expanded, setExpanded] = useState(false);
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
    <div className="grid gap-2">
      {error ? <Alert variant="warning">{error}</Alert> : null}
      {appliedCode ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[var(--success)]">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{t.applied}: {appliedCode}</span>
          </span>
          <Button type="button" variant="ghost" disabled={pending || !acceptedQuote} onClick={() => refresh(null)} className="min-h-9 shrink-0 px-2 text-sm">
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
            aria-controls="checkout-discount-fields"
            className="min-h-11 w-full justify-between px-0 text-sm font-semibold hover:bg-transparent"
            onClick={() => setExpanded((current) => !current)}
          >
            {t.add}
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
          {expanded ? (
            <div id="checkout-discount-fields" className="grid gap-2">
              <label htmlFor="discount-code" className="text-sm font-semibold">
                {t.label}
              </label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id="discount-code"
                  value={code}
                  autoComplete="off"
                  onChange={(event) => setCode(event.target.value)}
                  className="uppercase"
                />
                <Button type="button" variant="secondary" disabled={pending || !acceptedQuote || code.trim().length === 0} onClick={() => refresh(code.trim().toUpperCase())}>
                  {pending ? t.pending : t.apply}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {acceptedQuote?.discount.status === 'not_eligible' ? (
        <div>
          <Button type="button" variant="ghost" disabled={pending || !acceptedQuote} onClick={() => refresh(null)} className="min-h-9 px-2 text-sm">
            {t.remove}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
