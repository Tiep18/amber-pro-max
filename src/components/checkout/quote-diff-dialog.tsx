'use client';

import {Dialog as DialogPrimitive} from 'radix-ui';
import {formatMoney} from '@/catalog/money';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

const copy = {
  en: {
    title: 'Shipping and total changed',
    body: 'Review the server-calculated changes before continuing with this destination.',
    confirm: 'Use updated quote',
    cancel: 'Review destination',
    market: 'Shopping region',
    currency: 'Currency',
    shipping: 'Shipping',
    line: 'Item',
    total: 'Total',
    unavailable: 'unavailable',
    missing: 'removed',
    ready: 'available',
    invalid_variant: 'invalid option',
    quantity_capped: 'quantity adjusted',
    unknown: 'Not available'
  },
  vi: {
    title: 'Phí giao hàng và tổng tiền đã thay đổi',
    body: 'Hãy xem lại các thay đổi do hệ thống tính trước khi tiếp tục với địa chỉ này.',
    confirm: 'Dùng báo giá mới',
    cancel: 'Xem lại địa chỉ',
    market: 'Khu vực mua sắm',
    currency: 'Đơn vị tiền tệ',
    shipping: 'Phí giao hàng',
    line: 'Sản phẩm',
    total: 'Tổng tiền',
    unavailable: 'không khả dụng',
    missing: 'đã bị xóa',
    ready: 'khả dụng',
    invalid_variant: 'tùy chọn không hợp lệ',
    quantity_capped: 'số lượng đã điều chỉnh',
    unknown: 'Không khả dụng'
  }
} as const;

function changeLabel(
  locale: Locale,
  change: MaterialQuoteChange,
  quote: CartQuote,
  previousCurrency: CartQuote['currencyCode']
) {
  const t = copy[locale];
  const previousMoney = (amount: number | null) =>
    amount === null || !previousCurrency
      ? t.unknown
      : formatMoney({amountMinor: amount, currencyCode: previousCurrency});
  const currentMoney = (amount: number | null) =>
    amount === null || !quote.currencyCode
      ? t.unknown
      : formatMoney({amountMinor: amount, currencyCode: quote.currencyCode});
  const status = (value: string) => {
    switch (value) {
      case 'unavailable':
        return t.unavailable;
      case 'missing':
        return t.missing;
      case 'ready':
        return t.ready;
      case 'invalid_variant':
        return t.invalid_variant;
      case 'quantity_capped':
        return t.quantity_capped;
      default:
        return value.replaceAll('_', ' ');
    }
  };

  switch (change.type) {
    case 'market_changed':
      return `${t.market}: ${change.previousMarket.toUpperCase()} → ${change.currentMarket.toUpperCase()}`;
    case 'currency_changed':
      return `${t.currency}: ${change.previousCurrency ?? t.unknown} → ${change.currentCurrency ?? t.unknown}`;
    case 'shipping_changed':
      return `${t.shipping}: ${previousMoney(change.previousAmountMinor)} → ${currentMoney(change.currentAmountMinor)}`;
    case 'line_changed':
      return `${t.line} — ${change.title}: ${status(change.previousStatus)} → ${status(change.currentStatus)}`;
    case 'total_changed':
      return `${t.total}: ${previousMoney(change.previousTotalMinor)} → ${currentMoney(change.currentTotalMinor)}`;
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
  const currencyChange = changes.find(
    (change): change is Extract<MaterialQuoteChange, {type: 'currency_changed'}> =>
      change.type === 'currency_changed'
  );
  const previousCurrency =
    currencyChange?.previousCurrency === 'VND' ||
    currencyChange?.previousCurrency === 'USD'
      ? currencyChange.previousCurrency
      : proposal.currencyCode;

  function restoreDestinationFocus(event: Event) {
    event.preventDefault();
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[aria-labelledby="shipping-country-label"]')
        ?.focus();
    });
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(40,28,18,0.32)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby="quote-diff-description"
          onCloseAutoFocus={restoreDestinationFocus}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 outline-none"
        >
          <Card className="w-full shadow-none">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <DialogPrimitive.Title asChild>
                <CardTitle>{t.title}</CardTitle>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description asChild>
                <p
                  id="quote-diff-description"
                  className="text-sm leading-6 text-[var(--muted-foreground)]"
                >
                  {t.body}
                </p>
              </DialogPrimitive.Description>
            </CardHeader>
            <CardContent className="pt-1">
              <ul className="grid gap-2">
                {changes.map((change, index) => (
                  <li
                    key={`${change.type}-${index}`}
                    className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium"
                  >
                    {changeLabel(locale, change, proposal, previousCurrency)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-3">
                <Button onClick={onConfirm}>{t.confirm}</Button>
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary">{t.cancel}</Button>
                </DialogPrimitive.Close>
              </div>
            </CardContent>
          </Card>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
