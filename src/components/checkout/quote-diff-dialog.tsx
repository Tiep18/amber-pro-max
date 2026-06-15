'use client';

import {formatMoney} from '@/catalog/money';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

const copy = {
  en: {
    title: 'Review destination changes',
    body: 'Confirm these server-calculated changes before the checkout state is updated.',
    confirm: 'Confirm changes',
    cancel: 'Keep previous quote'
  },
  vi: {
    title: 'Xem lai thay doi giao hang',
    body: 'Xac nhan cac thay doi do may chu tinh truoc khi cap nhat trang thai thanh toan.',
    confirm: 'Xac nhan thay doi',
    cancel: 'Giu bao gia cu'
  }
} as const;

function changeLabel(change: MaterialQuoteChange, quote: CartQuote) {
  switch (change.type) {
    case 'market_changed':
      return `Market: ${change.previousMarket} -> ${change.currentMarket}`;
    case 'currency_changed':
      return `Currency: ${change.previousCurrency ?? '-'} -> ${change.currentCurrency ?? '-'}`;
    case 'shipping_changed':
      return `Shipping: ${
        change.previousAmountMinor === null || !quote.currencyCode
          ? '-'
          : formatMoney({amountMinor: change.previousAmountMinor, currencyCode: quote.currencyCode})
      } -> ${
        change.currentAmountMinor === null || !quote.currencyCode
          ? '-'
          : formatMoney({amountMinor: change.currentAmountMinor, currencyCode: quote.currencyCode})
      }`;
    case 'line_changed':
      return `${change.title}: ${change.previousStatus} -> ${change.currentStatus}`;
    case 'total_changed':
      return `Total: ${
        quote.currencyCode ? formatMoney({amountMinor: change.previousTotalMinor, currencyCode: quote.currencyCode}) : '-'
      } -> ${quote.currencyCode ? formatMoney({amountMinor: change.currentTotalMinor, currencyCode: quote.currencyCode}) : '-'}`;
  }
}

export function QuoteDiffDialog({
  locale,
  proposal,
  changes,
  onConfirm,
  onCancel
}: {
  locale: Locale;
  proposal: CartQuote;
  changes: MaterialQuoteChange[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = copy[locale];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <Card role="dialog" aria-modal="true" aria-labelledby="quote-diff-title" className="w-full max-w-[560px]">
        <CardHeader>
          <CardTitle id="quote-diff-title">{t.title}</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">{t.body}</p>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2">
            {changes.map((change, index) => (
              <li key={`${change.type}-${index}`} className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2">
                {changeLabel(change, proposal)}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-3">
            <Button onClick={onConfirm}>{t.confirm}</Button>
            <Button variant="secondary" onClick={onCancel}>{t.cancel}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
