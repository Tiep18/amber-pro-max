'use client';

import {CreditCard, FileText, MapPin, Package, ShieldCheck} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {formatMoney} from '@/catalog/money';
import {resolvePublicProductImageUrl} from '@/catalog/product-image-url';
import type {CheckoutPaymentIntent} from '@/checkout/schemas';
import type {ShippingAddress} from '@/checkout/shipping-address';
import {getShippingCountryOptions} from '@/checkout/shipping-address-ui';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {getCartPath} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {DiscountCodeForm} from './discount-code-form';

const copy = {
  en: {
    title: 'Your order',
    editCart: 'Edit cart',
    quantity: 'Qty',
    moreItems: (count: number) => `${count} more item${count === 1 ? '' : 's'} in your cart`,
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    total: 'Total',
    noShipping: 'Not required',
    notCalculated: 'Pending destination',
    unsupported: 'Unavailable',
    blocked: 'Resolve unavailable items before continuing.',
    payment: 'Payment',
    paymentPending: 'Available after the current quote is ready',
    paypal: 'PayPal · USD',
    vietqr: 'VietQR transfer · VND',
    automaticPayment: 'Selected from the confirmed market and currency.',
    destination: 'Deliver to',
    digitalDelivery: 'Digital delivery by email after confirmed payment',
    complete: 'Complete before continuing',
    policies: 'Policies',
    trust: 'The order starts as pending payment. Digital files unlock only after full payment is confirmed.'
  },
  vi: {
    title: 'Đơn hàng của bạn',
    editCart: 'Sửa giỏ hàng',
    quantity: 'SL',
    moreItems: (count: number) => `Còn ${count} sản phẩm trong giỏ`,
    subtotal: 'Tạm tính',
    discount: 'Giảm giá',
    shipping: 'Giao hàng',
    total: 'Tổng cộng',
    noShipping: 'Không cần',
    notCalculated: 'Chờ địa chỉ',
    unsupported: 'Chưa hỗ trợ',
    blocked: 'Hãy xử lý các sản phẩm chưa khả dụng trước khi tiếp tục.',
    payment: 'Thanh toán',
    paymentPending: 'Hiển thị sau khi báo giá hiện tại sẵn sàng',
    paypal: 'PayPal · USD',
    vietqr: 'Chuyển khoản VietQR · VND',
    automaticPayment: 'Được chọn theo thị trường và tiền tệ đã xác nhận.',
    destination: 'Giao tới',
    digitalDelivery: 'Nhận sản phẩm số qua email sau khi xác nhận thanh toán',
    complete: 'Cần hoàn tất trước khi tiếp tục',
    policies: 'Chính sách',
    trust: 'Đơn hàng bắt đầu ở trạng thái chờ thanh toán. File số chỉ mở sau khi toàn bộ thanh toán được xác nhận.'
  }
} as const;

type CheckoutPolicyLink = {
  policyKind: string;
  title: string;
  href: string;
};

function shippingText(quote: CartQuote, locale: Locale) {
  const t = copy[locale];
  if (quote.shipping.status === 'ready') {
    return quote.currencyCode
      ? formatMoney({amountMinor: quote.shipping.amountMinor, currencyCode: quote.currencyCode})
      : '-';
  }
  if (quote.shipping.status === 'no_shipping_required') return t.noShipping;
  if (quote.shipping.status === 'unsupported_destination') return t.unsupported;
  return t.notCalculated;
}

function destinationText(address: ShippingAddress, locale: Locale) {
  const country =
    getShippingCountryOptions(locale).find((option) => option.code === address.countryCode)?.label ??
    address.countryCode;
  return [address.addressLine1, address.locality, address.region, country].filter(Boolean).join(', ');
}

function paymentText(intent: CheckoutPaymentIntent | null, locale: Locale) {
  const t = copy[locale];
  if (intent === 'paypal_intent') return t.paypal;
  if (intent === 'vietqr_intent') return t.vietqr;
  return t.paymentPending;
}

export function OrderSummary({
  quote,
  locale,
  paymentIntent,
  shippingAddress,
  submitIssues,
  showSubmitIssues,
  feedbackRevision,
  actionLabel,
  actionDisabled,
  onSubmit,
  policyLinks,
  onAcceptedQuote
}: {
  quote: CartQuote | null;
  locale: Locale;
  paymentIntent: CheckoutPaymentIntent | null;
  shippingAddress: ShippingAddress;
  submitIssues: string[];
  showSubmitIssues: boolean;
  feedbackRevision: number;
  actionLabel: string;
  actionDisabled: boolean;
  onSubmit: () => void;
  policyLinks: CheckoutPolicyLink[];
  onAcceptedQuote: (quote: CartQuote) => void;
}) {
  const t = copy[locale];
  const currencyCode = quote?.currencyCode;
  const subtotal =
    quote && currencyCode ? formatMoney({amountMinor: quote.subtotalMinor, currencyCode}) : '-';
  const discount =
    quote?.discount.status === 'applied' && currencyCode
      ? formatMoney({amountMinor: quote.discount.amountMinor, currencyCode})
      : null;
  const total =
    quote && currencyCode ? formatMoney({amountMinor: quote.totalMinor, currencyCode}) : '-';
  const visibleLines = quote?.lines.slice(0, 4) ?? [];
  const remainingLineCount = Math.max(0, (quote?.lines.length ?? 0) - visibleLines.length);
  const hasPhysical = quote?.lines.some((line) => line.fulfillmentType === 'physical') ?? false;

  return (
    <Card className="overflow-hidden bg-[var(--surface-paper)] shadow-[0_18px_54px_rgb(73_52_32/9%)]">
      <CardHeader className="mb-0 flex-row items-center justify-between border-b border-[var(--border)]/70 px-5 py-4">
        <CardTitle className="text-lg">{t.title}</CardTitle>
        <Link
          href={getCartPath(locale)}
          className="rounded-sm text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          {t.editCart}
        </Link>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 py-4">
        {visibleLines.length ? (
          <div className="grid gap-3">
            {visibleLines.map((line) => {
              const imageUrl = resolvePublicProductImageUrl(line.imageUrl);
              const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
              return (
                <article key={line.lineId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                  <div className="relative size-12 overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/60">
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-[var(--accent)]">
                        <Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{line.title}</p>
                    <p className="truncate text-xs leading-5 text-[var(--muted-foreground)]">
                      {line.variantLabel ? `${line.variantLabel} · ` : ''}{t.quantity} {line.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney({amountMinor: line.lineSubtotalMinor, currencyCode: line.currencyCode})}
                  </span>
                </article>
              );
            })}
            {remainingLineCount > 0 ? (
              <Link href={getCartPath(locale)} className="text-xs font-semibold text-[var(--accent)]">
                {t.moreItems(remainingLineCount)}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="border-y border-[var(--border)]/60 py-1">
          <DiscountCodeForm
            locale={locale}
            acceptedQuote={quote}
            feedbackRevision={feedbackRevision}
            onAcceptedQuote={onAcceptedQuote}
          />
        </div>

        {quote?.status === 'blocked' ? (
          <Alert variant="destructive" className="px-3 py-2 text-sm">
            {quote.shipping.status === 'unsupported_destination' ? t.unsupported : t.blocked}
          </Alert>
        ) : null}
        <dl className="grid gap-2 text-sm tabular-nums">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted-foreground)]">{t.subtotal}</dt>
            <dd className="font-semibold">{subtotal}</dd>
          </div>
          {quote?.discount.status === 'applied' ? (
            <div className="flex justify-between gap-3 text-[var(--success)]">
              <dt>{t.discount} · {quote.discount.code}</dt>
              <dd className="font-semibold">-{discount}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted-foreground)]">{t.shipping}</dt>
            <dd className="max-w-[220px] text-right font-medium">{quote ? shippingText(quote, locale) : t.notCalculated}</dd>
          </div>
        </dl>

        <Separator className="border-[var(--border)]/70" />
        <div className="flex items-end justify-between gap-3 text-xl font-semibold tabular-nums">
          <span>{t.total}</span>
          <span className="text-[var(--brand)]">{total}</span>
        </div>

        <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3 text-sm">
          <div className="flex items-start gap-2.5">
            <CreditCard aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">{t.payment}</p>
              <p data-testid="checkout-payment-method" aria-live="polite" className="font-semibold">{paymentText(paymentIntent, locale)}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">{t.automaticPayment}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 border-t border-[var(--border)]/60 pt-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                {hasPhysical ? t.destination : t.digitalDelivery}
              </p>
              {hasPhysical && shippingAddress.countryCode ? (
                <p className="truncate font-semibold">{destinationText(shippingAddress, locale)}</p>
              ) : null}
            </div>
          </div>
        </div>

        {showSubmitIssues && submitIssues.length > 0 ? (
          <Alert variant="warning" className="px-3 py-2 text-sm">
            <p className="font-semibold text-[var(--foreground)]">{t.complete}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {submitIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </Alert>
        ) : null}

        <Button
          data-testid="checkout-submit"
          disabled={actionDisabled}
          onClick={onSubmit}
          className="hidden min-h-12 w-full text-base lg:inline-flex"
        >
          {actionLabel}
        </Button>

        <div className="flex items-start gap-2 text-xs leading-5 text-[var(--muted-foreground)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
          <p>{t.trust}</p>
        </div>

        {policyLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-[var(--foreground)]">{t.policies}</span>
            {policyLinks.map((policy) => (
              <a key={policy.policyKind} href={policy.href} className="font-semibold text-[var(--accent)]">
                {policy.title}
              </a>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MobileCheckoutDock({
  quote,
  locale,
  label,
  disabled,
  onSubmit
}: {
  quote: CartQuote | null;
  locale: Locale;
  label: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const total =
    quote?.currencyCode
      ? formatMoney({amountMinor: quote.totalMinor, currencyCode: quote.currencyCode})
      : '-';

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface-paper)]/96 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_28px_rgb(73_52_32/10%)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_minmax(164px,auto)] items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">{copy[locale].total}</p>
          <p className="truncate text-lg font-semibold tabular-nums text-[var(--brand)]">{total}</p>
        </div>
        <Button data-testid="checkout-submit-mobile" className="min-h-12 px-4" disabled={disabled} onClick={onSubmit}>
          <span className="truncate">{label}</span>
        </Button>
      </div>
    </div>
  );
}
