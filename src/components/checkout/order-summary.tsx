'use client';

import {CreditCard, FileText, Mail, MapPin, Package, ShieldCheck} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {createTranslator} from 'next-intl';
import {formatMoney} from '@/catalog/money';
import {resolvePublicProductImageUrl} from '@/catalog/product-image-url';
import type {CheckoutPaymentIntent} from '@/checkout/schemas';
import type {ShippingAddress} from '@/checkout/shipping-address';
import {getShippingCountryOptions} from '@/checkout/shipping-address-ui';
import {deliveryEstimateForQuote} from '@/checkout/delivery-estimate';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {getCartPath} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {PAYPAL_RESERVATION_WINDOW_MINUTES} from '@/payments/reservation';
import {DiscountCodeForm, type DiscountApplyOutcome} from './discount-code-form';

export type CheckoutPolicyLink = {policyKind: string; title: string; href: string};

export type OrderSummaryCopy = ReturnType<typeof summaryCopy>;

function summaryCopy(locale: Locale) {
  const translate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.summary'
  });
  return {
    title: translate('title'), editCart: translate('editCart'), quantity: translate('quantity'),
    subtotal: translate('subtotal'), discount: translate('discount'), shipping: translate('shipping'), total: translate('total'),
    deliveryEstimate: translate('deliveryEstimate'),
    deliveryEstimateValue: (min: number, max: number) => translate('deliveryEstimateValue', {min, max}),
    totalPending: translate('totalPending'),
    noShipping: translate('noShipping'), notCalculated: translate('notCalculated'), unsupported: translate('unsupported'),
    payment: translate('payment'), paymentPending: translate('paymentPending'), paypal: translate('paypal'), vietqr: translate('vietqr'),
    automaticPayment: translate('automaticPayment'), destination: translate('destination'), digitalDelivery: translate('digitalDelivery'),
    contactEmail: translate('contactEmail'),
    complete: translate('complete'), policies: translate('policies'), trust: translate('trust'),
    fulfillmentNote: translate('fulfillmentNote'),
    showSummary: translate('show'), hideSummary: translate('hide'),
    expectationPaypal: (minutes: number) => translate('paypalExpectation', {minutes}),
    expectationVietqr: translate('vietqrExpectation'),
    expectationPaypalShort: (minutes: number) => translate('paypalExpectationShort', {minutes}),
    expectationVietqrShort: translate('vietqrExpectationShort'),
    moreItems: (count: number) => translate('moreItems', {count})
  };
}

export type OrderSummaryViewModel = Readonly<{
  quote: CartQuote | null;
  locale: Locale;
  paymentIntent: CheckoutPaymentIntent | null;
  visibleLines: CartQuote['lines'];
  remainingLineCount: number;
  subtotal: string;
  discount: string | null;
  shipping: string;
  total: string;
  destination: string | null;
  hasPhysical: boolean;
  /**
   * True while a physical cart still has no shipping fee in the total. The
   * grand total is real money the customer anchors on, so it must not be
   * presented as final while a line item is still missing from it.
   */
  totalPendingShipping: boolean;
  /** Pre-formatted delivery window, or null while there is nothing to promise. */
  deliveryEstimate: string | null;
  contactEmail: string | null;
  payment: string;
  blockingIssues: readonly string[];
  showBlockingIssues: boolean;
  policyLinks: readonly CheckoutPolicyLink[];
  pending: boolean;
}>;

function shippingText(quote: CartQuote, locale: Locale) {
  const t = summaryCopy(locale);
  if (quote.shipping.status === 'ready') {
    return quote.currencyCode ? formatMoney({amountMinor: quote.shipping.amountMinor, currencyCode: quote.currencyCode}) : '-';
  }
  if (quote.shipping.status === 'no_shipping_required') return t.noShipping;
  if (quote.shipping.status === 'unsupported_destination') return t.unsupported;
  return t.notCalculated;
}

function destinationText(address: ShippingAddress, locale: Locale) {
  const country = getShippingCountryOptions(locale).find((option) => option.code === address.countryCode)?.label ?? address.countryCode;
  return [address.addressLine1, address.locality, address.region, country].filter(Boolean).join(', ');
}

function paymentText(intent: CheckoutPaymentIntent | null, locale: Locale) {
  const t = summaryCopy(locale);
  if (intent === 'paypal_intent') return t.paypal;
  if (intent === 'vietqr_intent') return t.vietqr;
  return t.paymentPending;
}

function expectationText(intent: CheckoutPaymentIntent | null, locale: Locale) {
  const t = summaryCopy(locale);
  if (intent === 'paypal_intent') return t.expectationPaypal(PAYPAL_RESERVATION_WINDOW_MINUTES);
  if (intent === 'vietqr_intent') return t.expectationVietqr;
  return null;
}

function expectationTextShort(intent: CheckoutPaymentIntent | null, locale: Locale) {
  const t = summaryCopy(locale);
  if (intent === 'paypal_intent') return t.expectationPaypalShort(PAYPAL_RESERVATION_WINDOW_MINUTES);
  if (intent === 'vietqr_intent') return t.expectationVietqrShort;
  return null;
}

export function buildOrderSummaryViewModel({quote, locale, paymentIntent, shippingAddress, contactEmail, blockingIssues, showBlockingIssues, policyLinks, pending}: {
  quote: CartQuote | null;
  locale: Locale;
  paymentIntent: CheckoutPaymentIntent | null;
  shippingAddress: ShippingAddress;
  contactEmail?: string | null;
  blockingIssues: string[];
  showBlockingIssues: boolean;
  policyLinks: CheckoutPolicyLink[];
  pending: boolean;
}): OrderSummaryViewModel {
  const currencyCode = quote?.currencyCode;
  const visibleLines = quote?.lines.slice(0, 4) ?? [];
  const hasPhysical = quote?.lines.some((line) => line.fulfillmentType === 'physical') ?? false;
  const shippingStatus = quote?.shipping.status;
  const estimate = deliveryEstimateForQuote(quote);
  return Object.freeze({
    quote,
    locale,
    paymentIntent,
    visibleLines,
    remainingLineCount: Math.max(0, (quote?.lines.length ?? 0) - visibleLines.length),
    subtotal: quote && currencyCode ? formatMoney({amountMinor: quote.subtotalMinor, currencyCode}) : '-',
    discount: quote?.discount.status === 'applied' && currencyCode ? formatMoney({amountMinor: quote.discount.amountMinor, currencyCode}) : null,
    shipping: quote ? shippingText(quote, locale) : summaryCopy(locale).notCalculated,
    total: quote && currencyCode ? formatMoney({amountMinor: quote.totalMinor, currencyCode}) : '-',
    destination: hasPhysical && shippingAddress.countryCode ? destinationText(shippingAddress, locale) : null,
    hasPhysical,
    totalPendingShipping:
      hasPhysical &&
      (shippingStatus === 'not_calculated' || shippingStatus === 'unsupported_destination'),
    deliveryEstimate: estimate
      ? summaryCopy(locale).deliveryEstimateValue(
          estimate.minBusinessDays,
          estimate.maxBusinessDays
        )
      : null,
    contactEmail: contactEmail?.trim() || null,
    payment: paymentText(paymentIntent, locale),
    blockingIssues: Object.freeze([...new Set(blockingIssues)]),
    showBlockingIssues,
    policyLinks: Object.freeze([...policyLinks]),
    pending
  });
}

type SummaryInteractionProps = {
  model: OrderSummaryViewModel;
  discountPending: boolean;
  controlsDisabled: boolean;
  onApplyDiscount: (code: string | null) => Promise<DiscountApplyOutcome>;
};

function OrderSummaryBody({model, discountPending, controlsDisabled, onApplyDiscount, surface, action}: SummaryInteractionProps & {
  surface: 'mobile' | 'desktop';
  action?: {label: string; disabled: boolean; onSubmit: () => void};
}) {
  const {quote, locale} = model;
  const t = summaryCopy(model.locale);
  const blockerId = `checkout-submit-blocker-${surface}`;
  return (
    <CardContent className="grid gap-4 px-4 py-4 sm:px-5">
      {model.visibleLines.length ? (
        <div className="grid gap-3">
          {model.visibleLines.map((line) => {
            const imageUrl = resolvePublicProductImageUrl(line.imageUrl);
            const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
            return (
              <article key={line.lineId} className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_minmax(0,auto)] items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/60">
                  {imageUrl ? <Image src={imageUrl} alt="" fill sizes="48px" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--accent)]"><Icon aria-hidden="true" className="size-5" strokeWidth={1.6} /></span>}
                </div>
                <div className="min-w-0"><p className="break-words text-sm font-semibold">{line.title}</p><p className="break-words text-xs leading-5 text-[var(--muted-foreground)]">{line.variantLabel ? `${line.variantLabel} · ` : ''}{t.quantity} {line.quantity}</p></div>
                <span className="min-w-0 break-words text-right text-sm font-semibold tabular-nums">{formatMoney({amountMinor: line.lineSubtotalMinor, currencyCode: line.currencyCode})}</span>
              </article>
            );
          })}
          {model.remainingLineCount > 0 ? <Link href={getCartPath(locale)} className="text-xs font-semibold text-[var(--accent)]">{t.moreItems(model.remainingLineCount)}</Link> : null}
        </div>
      ) : null}

      <div className="border-y border-[var(--border)]/60 py-1">
        <DiscountCodeForm locale={locale} acceptedQuote={quote} pending={discountPending} disabled={controlsDisabled} idSuffix={surface} onApply={onApplyDiscount} />
      </div>

      <dl className="grid gap-2 text-sm tabular-nums">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-[var(--muted-foreground)]">{t.subtotal}</dt><dd className="min-w-0 break-words text-right font-semibold">{model.subtotal}</dd></div>
        {quote?.discount.status === 'applied' ? <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[var(--success)]"><dt className="min-w-0 break-words">{t.discount} · {quote.discount.code}</dt><dd className="min-w-0 break-words text-right font-semibold">-{model.discount}</dd></div> : null}
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-[var(--muted-foreground)]">{t.shipping}</dt>{model.pending ? <dd aria-hidden="true" className="h-4 w-20 animate-pulse motion-reduce:animate-none rounded bg-[var(--surface-muted)]" /> : <dd className="min-w-0 break-words text-right font-medium">{model.shipping}</dd>}</div>
        {/* "When will it arrive?" is asked as often as "how much is shipping?",
            and it is the one of the two this page used to leave unanswered. */}
        {model.deliveryEstimate && !model.pending ? <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs leading-5 text-[var(--muted-foreground)]"><dt>{t.deliveryEstimate}</dt><dd data-testid={`checkout-delivery-estimate-${surface}`} className="min-w-0 break-words text-right">{model.deliveryEstimate}</dd></div> : null}
      </dl>

      <Separator className="border-[var(--border)]/70" />
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 font-semibold tabular-nums"><span className={model.totalPendingShipping ? 'min-w-0 break-words text-sm leading-5' : 'text-xl'}>{model.totalPendingShipping ? t.totalPending : t.total}</span>{model.pending ? <span aria-hidden="true" className="h-6 w-24 animate-pulse motion-reduce:animate-none rounded bg-[var(--surface-muted)]" /> : <span data-testid={`checkout-total${surface === 'mobile' ? '-summary-mobile' : ''}`} className={`min-w-0 break-words text-right text-xl ${model.totalPendingShipping ? 'text-[var(--muted-foreground)]' : 'text-[var(--brand)]'}`}>{model.total}</span>}</div>

      <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3 text-sm">
        <div className="flex items-start gap-2.5"><CreditCard aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /><div className="min-w-0"><p className="text-xs font-medium text-[var(--muted-foreground)]">{t.payment}</p><p data-testid={`checkout-payment-method-${surface}`} aria-live="polite" className="break-words font-semibold">{model.payment}</p><p className="mt-0.5 break-words text-xs leading-5 text-[var(--muted-foreground)]">{t.automaticPayment}</p></div></div>
        <div className="flex items-start gap-2.5 border-t border-[var(--border)]/60 pt-2"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /><div className="min-w-0"><p className="text-xs font-medium text-[var(--muted-foreground)]">{model.hasPhysical ? t.destination : t.digitalDelivery}</p>{model.destination ? <p className="break-words font-semibold">{model.destination}</p> : null}</div></div>
        {/* Digital orders are delivered to this address and nowhere else, so the
            last thing shown before the pay button is what the customer typed. */}
        {model.contactEmail ? <div className="flex items-start gap-2.5 border-t border-[var(--border)]/60 pt-2"><Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /><div className="min-w-0"><p className="text-xs font-medium text-[var(--muted-foreground)]">{t.contactEmail}</p><p data-testid={`checkout-contact-email-${surface}`} className="break-all font-semibold">{model.contactEmail}</p></div></div> : null}
      </div>

      {model.showBlockingIssues && model.blockingIssues.length > 0 ? <Alert id={blockerId} variant="warning" className="min-w-0 px-3 py-2 text-sm"><p className="font-semibold text-[var(--foreground)]">{t.complete}</p><ul className="mt-1 list-disc space-y-1 break-words pl-5">{model.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></Alert> : null}

      {action ? <Button data-testid="checkout-submit" disabled={action.disabled} aria-describedby={model.showBlockingIssues && model.blockingIssues.length ? blockerId : undefined} onClick={action.onSubmit} className="min-h-12 w-full whitespace-normal break-words text-center text-base leading-5">{action.label}</Button> : null}
      {action && expectationText(model.paymentIntent, locale) ? <p className="break-words text-xs leading-5 text-[var(--muted-foreground)]">{expectationText(model.paymentIntent, locale)}</p> : null}

      {/* The shield slot says what the customer gets; the fulfilment condition
          is still stated, just not dressed up as a reassurance. */}
      <div className="grid gap-1 text-xs leading-5 text-[var(--muted-foreground)]">
        <div className="flex items-start gap-2"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--success)]" /><p className="min-w-0 break-words">{t.trust}</p></div>
        <p className="min-w-0 break-words pl-6">{t.fulfillmentNote}</p>
      </div>
      {model.policyLinks.length > 0 ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="font-semibold">{t.policies}</span>{model.policyLinks.map((policy) => <a key={policy.policyKind} href={policy.href} className="font-semibold text-[var(--accent)]">{policy.title}</a>)}</div> : null}
    </CardContent>
  );
}

export function OrderSummary(props: SummaryInteractionProps & {actionLabel: string; actionDisabled: boolean; onSubmit: () => void}) {
  const t = summaryCopy(props.model.locale);
  return (
    <Card className="overflow-hidden bg-[var(--surface-paper)] shadow-[0_18px_54px_rgb(73_52_32/9%)]">
      <CardHeader className="mb-0 flex-row items-center justify-between gap-3 border-b border-[var(--border)]/70 px-4 py-4 sm:px-5"><CardTitle className="min-w-0 break-words text-lg">{t.title}</CardTitle><Link href={getCartPath(props.model.locale)} className="shrink-0 rounded-sm text-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">{t.editCart}</Link></CardHeader>
      <OrderSummaryBody {...props} surface="desktop" action={{label: props.actionLabel, disabled: props.actionDisabled, onSubmit: props.onSubmit}} />
    </Card>
  );
}

export function MobileOrderSummary({expanded, onExpandedChange, ...props}: SummaryInteractionProps & {expanded: boolean; onExpandedChange: (expanded: boolean) => void}) {
  const t = summaryCopy(props.model.locale);
  const contentId = 'checkout-mobile-order-summary-content';
  return (
    <section className="lg:hidden" aria-label={t.title}>
      <Card className="overflow-hidden bg-[var(--surface-paper)] shadow-none">
        <button type="button" aria-expanded={expanded} aria-controls={contentId} className="grid min-h-12 w-full gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]" onClick={() => onExpandedChange(!expanded)}>
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0 break-words text-sm font-semibold">{expanded ? t.hideSummary : t.showSummary}</span>
            <span className={`min-w-0 break-words text-right font-semibold tabular-nums ${props.model.totalPendingShipping ? 'text-[var(--muted-foreground)]' : 'text-[var(--brand)]'}`}>{props.model.total}</span>
          </span>
          {/* Collapsed by default, this bar is all a phone shows of the order.
              A row of thumbnails is what makes it recognisable as *their* order
              without costing them a tap. Decorative: every item is named in the
              panel this button opens. */}
          {!expanded && props.model.visibleLines.length > 0 ? (
            <span aria-hidden="true" data-testid="checkout-mobile-summary-thumbnails" className="flex items-center gap-1.5">
              {props.model.visibleLines.map((line) => {
                const imageUrl = resolvePublicProductImageUrl(line.imageUrl);
                const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
                return (
                  <span key={line.lineId} className="relative size-8 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/60">
                    {imageUrl ? <Image src={imageUrl} alt="" fill sizes="32px" className="object-cover" /> : <span className="grid h-full place-items-center text-[var(--accent)]"><Icon aria-hidden="true" className="size-4" strokeWidth={1.6} /></span>}
                  </span>
                );
              })}
              {props.model.remainingLineCount > 0 ? <span className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">+{props.model.remainingLineCount}</span> : null}
            </span>
          ) : null}
        </button>
        <div id={contentId} hidden={!expanded} className="border-t border-[var(--border)]/70">
          <OrderSummaryBody {...props} surface="mobile" />
        </div>
      </Card>
    </section>
  );
}

export function MobileCheckoutDock({model, label, disabled, onSubmit}: {model: OrderSummaryViewModel; label: string; disabled: boolean; onSubmit: () => void}) {
  const t = summaryCopy(model.locale);
  const blockerId = 'checkout-submit-blocker-dock';
  const showBlockers = model.showBlockingIssues && model.blockingIssues.length > 0;
  const topLine = !disabled ? expectationTextShort(model.paymentIntent, model.locale) : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface-paper)]/96 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_28px_rgb(73_52_32/10%)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl gap-2">
        {showBlockers ? <div id={blockerId} className="max-h-28 overflow-y-auto text-xs leading-5 text-[var(--muted-foreground)]"><ul className="list-disc space-y-0.5 break-words pl-5">{model.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : topLine ? <p className="break-words text-xs leading-5 text-[var(--muted-foreground)]">{topLine}</p> : null}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(148px,auto)] items-center gap-3">
          <div className="min-w-0"><p className="break-words text-xs font-medium leading-4 text-[var(--muted-foreground)]">{model.totalPendingShipping ? t.totalPending : t.total}</p><p data-testid="checkout-total-mobile" className={`break-words text-lg font-semibold tabular-nums ${model.totalPendingShipping ? 'text-[var(--muted-foreground)]' : 'text-[var(--brand)]'}`}>{model.total}</p></div>
          <Button data-testid="checkout-submit-mobile" className="min-h-12 whitespace-normal break-words px-4 text-center leading-5" disabled={disabled} aria-describedby={showBlockers ? blockerId : undefined} onClick={onSubmit}>{label}</Button>
        </div>
      </div>
    </div>
  );
}
