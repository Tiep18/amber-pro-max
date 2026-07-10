'use client';

import {formatMoney} from '@/catalog/money';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import type {CartQuote} from '@/checkout/types';

const copy = {
  en: {
    title: 'Order summary',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    total: 'Total',
    noShipping: 'No shipping is required for digital-only carts.',
    notCalculated: 'Enter a shipping country to calculate physical-item shipping.',
    unsupported: 'This destination is not supported for the current physical items. The cart is preserved.',
    blocked: 'Resolve unavailable items before continuing.',
    discountRejected: 'Discount code is not eligible for this cart.'
  },
  vi: {
    title: 'Tom tat don hang',
    subtotal: 'Tam tinh',
    discount: 'Giam gia',
    shipping: 'Van chuyen',
    total: 'Tong cong',
    noShipping: 'Gio hang chi co san pham so nen khong can phi van chuyen.',
    notCalculated: 'Nhap quoc gia giao hang de tinh phi cho san pham vat ly.',
    unsupported: 'Dia diem nay chua duoc ho tro cho san pham vat ly hien tai. Gio hang van duoc giu nguyen.',
    blocked: 'Hay xu ly cac dong hang khong kha dung truoc khi tiep tuc.',
    discountRejected: 'Ma giam gia khong phu hop voi gio hang nay.'
  }
} as const;

function shippingText(quote: CartQuote, locale: Locale) {
  const t = copy[locale];
  if (quote.shipping.status === 'ready') {
    return quote.currencyCode ? formatMoney({amountMinor: quote.shipping.amountMinor, currencyCode: quote.currencyCode}) : '-';
  }
  if (quote.shipping.status === 'no_shipping_required') {
    return t.noShipping;
  }
  if (quote.shipping.status === 'unsupported_destination') {
    return t.unsupported;
  }
  return t.notCalculated;
}

export function OrderSummary({quote, locale}: {quote: CartQuote | null; locale: Locale}) {
  const t = copy[locale];
  const currencyCode = quote?.currencyCode;
  const subtotal = quote && currencyCode ? formatMoney({amountMinor: quote.subtotalMinor, currencyCode}) : '-';
  const discount = quote?.discount.status === 'applied' && currencyCode ? formatMoney({amountMinor: quote.discount.amountMinor, currencyCode}) : null;
  const total = quote && currencyCode ? formatMoney({amountMinor: quote.totalMinor, currencyCode}) : '-';

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b border-[var(--border)] pb-4">
        <CardTitle className="text-lg">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {quote?.status === 'blocked' ? <Alert variant="destructive">{quote.shipping.status === 'unsupported_destination' ? t.unsupported : t.blocked}</Alert> : null}
        <div className="flex justify-between gap-3 tabular-nums">
          <span>{t.subtotal}</span>
          <strong>{subtotal}</strong>
        </div>
        {quote?.discount.status === 'applied' ? (
          <div className="flex justify-between gap-3 text-sm tabular-nums text-[var(--accent)]">
            <span>{t.discount} {quote.discount.code}</span>
            <span>-{discount}</span>
          </div>
        ) : null}
        {quote?.discount.status === 'not_eligible' ? <Alert variant="warning">{t.discountRejected}</Alert> : null}
        <div className="flex justify-between gap-3 text-sm leading-6 text-[var(--muted-foreground)]">
          <span>{t.shipping}</span>
          <span className="max-w-[220px] text-right">{quote ? shippingText(quote, locale) : t.notCalculated}</span>
        </div>
        <Separator />
        <div className="flex justify-between gap-3 text-xl font-semibold tabular-nums">
          <span>{t.total}</span>
          <span>{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}
