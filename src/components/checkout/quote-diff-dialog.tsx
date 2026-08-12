'use client';

import {Dialog as DialogPrimitive} from 'radix-ui';
import {createTranslator} from 'next-intl';
import {formatMoney} from '@/catalog/money';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

type QuoteReviewCopy = {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  market: string;
  currency: string;
  shipping: string;
  line: string;
  total: string;
  unknown: string;
  status: (value: string) => string;
};

function quoteReviewCopy(locale: Locale): QuoteReviewCopy {
  const translate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.quoteReview'
  });
  const statuses: Record<string, string> = {
    unavailable: translate('statusUnavailable'),
    missing: translate('statusMissing'),
    ready: translate('statusReady'),
    invalid_variant: translate('statusInvalidVariant'),
    quantity_capped: translate('statusQuantityCapped')
  };
  return {
    title: translate('title'),
    body: translate('body'),
    confirm: translate('confirm'),
    cancel: translate('cancel'),
    market: translate('market'),
    currency: translate('currency'),
    shipping: translate('shipping'),
    line: translate('line'),
    total: translate('total'),
    unknown: translate('unknown'),
    status: (value: string) => statuses[value] ?? value.replaceAll('_', ' ')
  };
}

function changeLabel(
  t: QuoteReviewCopy,
  change: MaterialQuoteChange,
  quote: CartQuote,
  previousCurrency: CartQuote['currencyCode']
) {
  const previousMoney = (amount: number | null) =>
    amount === null || !previousCurrency
      ? t.unknown
      : formatMoney({amountMinor: amount, currencyCode: previousCurrency});
  const currentMoney = (amount: number | null) =>
    amount === null || !quote.currencyCode
      ? t.unknown
      : formatMoney({amountMinor: amount, currencyCode: quote.currencyCode});

  switch (change.type) {
    case 'market_changed':
      return `${t.market}: ${change.previousMarket.toUpperCase()} → ${change.currentMarket.toUpperCase()}`;
    case 'currency_changed':
      return `${t.currency}: ${change.previousCurrency ?? t.unknown} → ${change.currentCurrency ?? t.unknown}`;
    case 'shipping_changed':
      return `${t.shipping}: ${previousMoney(change.previousAmountMinor)} → ${currentMoney(change.currentAmountMinor)}`;
    case 'line_changed':
      return `${t.line} — ${change.title}: ${t.status(change.previousStatus)} → ${t.status(change.currentStatus)}`;
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
  const t = quoteReviewCopy(locale);
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
    // This dialog is opened by a quote settling, not by a trigger element, so
    // Radix has nothing to restore focus to and drops it on `body`. Send it to
    // the control the customer was last using instead — and only override the
    // default when that control is actually on the page, which it is not for a
    // digital-only cart. The previous selector matched nothing at all: no
    // element has ever carried `aria-labelledby="shipping-country-label"`.
    const target = document.getElementById('shipping-country-trigger');
    if (!target) return;
    event.preventDefault();
    window.requestAnimationFrame(() => target.focus());
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
                    {changeLabel(t, change, proposal, previousCurrency)}
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
