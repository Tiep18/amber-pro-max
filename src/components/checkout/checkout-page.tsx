'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {CustomerShippingAddress} from '@/account/addresses';
import type {Locale} from '@/i18n/routing';
import type {CartQuote} from '@/checkout/types';
import {
  prepareGuestCheckoutRecoveryAction,
  refreshCheckoutQuoteAction,
  submitCheckoutAction,
  type SubmitCheckoutActionState
} from '@/checkout/actions';
import type {ShippingAddress} from '@/checkout/shipping-address';
import {
  acceptQuoteProposal,
  beginQuoteRequest,
  canSubmitAcceptedQuote,
  createCheckoutQuoteLifecycleState,
  reviewDestination,
  settleQuoteRequest,
  type CheckoutQuoteLifecycleState,
  type QuoteDestination
} from '@/checkout/quote-lifecycle';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useCart} from '@/components/cart/cart-provider';
import {ContactForm, type CheckoutPaymentIntent} from './contact-form';
import {DestinationForm} from './destination-form';
import {DiscountCodeForm} from './discount-code-form';
import {OrderSummary} from './order-summary';
import {SavedAddressSelector} from './saved-address-selector';
import {QuoteDiffDialog} from './quote-diff-dialog';

const copy = {
  en: {
    title: 'Checkout',
    intro: 'Complete the details below, then create a pending order and continue to payment.',
    contact: 'Contact',
    contactIntro: 'Where we send your order updates and payment instructions.',
    discount: 'Discount',
    discountIntro: 'Optional. Codes are checked against the latest server quote.',
    destination: 'Destination',
    destinationIntro: 'Required for handmade pieces. Digital-only carts skip shipping.',
    review: 'Review',
    handoff: 'Confirm total and continue',
    submitting: 'Creating order',
    pendingBoundary: 'Payment confirmation happens after this step. Digital files remain locked until the full order is confirmed paid.',
    empty: 'Your cart is empty.',
    completeThese: 'Complete these before continuing:',
    missingContact: 'Enter a valid contact email.',
    missingQuote: 'Refresh the cart quote.',
    missingShipping: 'Update the delivery destination.',
    unsupportedShipping: 'Choose a supported shipping destination.',
    invalid: 'Check your contact details and cart before continuing.',
    stale: 'The quote changed. Review the updated total and try again.',
    conflict: 'Checkout could not reserve the current items. Review your cart and try again.',
    success: 'Order is awaiting payment.',
    deadline: 'Reservation deadline',
    policies: 'Review store policies before payment'
  },
  vi: {
    title: 'Thanh toan',
    intro: 'Hoan tat thong tin ben duoi, tao don hang cho thanh toan roi tiep tuc thanh toan.',
    contact: 'Lien he',
    contactIntro: 'Noi nhan cap nhat don hang va huong dan thanh toan.',
    discount: 'Giam gia',
    discountIntro: 'Khong bat buoc. Ma se duoc kiem tra theo bao gia moi nhat tu server.',
    destination: 'Dia diem',
    destinationIntro: 'Can cho san pham handmade. Gio hang chi co file so se bo qua van chuyen.',
    review: 'Xem lai',
    handoff: 'Xac nhan tong tien va tiep tuc',
    submitting: 'Dang tao don hang',
    pendingBoundary: 'Xac nhan thanh toan dien ra sau buoc nay. File so van bi khoa cho den khi don hang duoc xac nhan da thanh toan day du.',
    empty: 'Gio hang dang trong.',
    completeThese: 'Hoan tat cac muc nay truoc khi tiep tuc:',
    missingContact: 'Nhap email lien he hop le.',
    missingQuote: 'Cap nhat lai bao gia gio hang.',
    missingShipping: 'Cap nhat dia diem giao hang.',
    unsupportedShipping: 'Chon dia diem giao hang duoc ho tro.',
    invalid: 'Kiem tra thong tin lien he va gio hang truoc khi tiep tuc.',
    stale: 'Bao gia da thay doi. Hay xem lai tong tien va thu lai.',
    conflict: 'Checkout khong the giu cac san pham hien tai. Hay xem lai gio hang va thu lai.',
    success: 'Don hang dang cho thanh toan.',
    deadline: 'Han giu hang',
    policies: 'Xem chinh sach cua cua hang truoc khi thanh toan'
  }
} as const;

const emptyShippingAddress: ShippingAddress = {
  recipientName: '',
  phoneNumber: '',
  countryCode: '',
  region: null,
  locality: null,
  addressLine1: '',
  addressLine2: null,
  postalCode: null
};

type CheckoutPolicyLink = {
  policyKind: string;
  title: string;
  href: string;
};

export function CheckoutPage({
  locale,
  savedAddresses = [],
  policyLinks = []
}: {
  locale: Locale;
  savedAddresses?: CustomerShippingAddress[];
  policyLinks?: CheckoutPolicyLink[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const {quote, cart} = useCart();
  const [lifecycle, setLifecycleState] = useState(() => createCheckoutQuoteLifecycleState(quote));
  const lifecycleRef = useRef(lifecycle);
  const acceptedQuote = lifecycle.acceptedQuote;
  const [email, setEmail] = useState('');
  const [contactReady, setContactReady] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<CheckoutPaymentIntent>('paypal_intent');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(emptyShippingAddress);
  const [submitResult, setSubmitResult] = useState<SubmitCheckoutActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function setLifecycle(next: CheckoutQuoteLifecycleState) {
    lifecycleRef.current = next;
    setLifecycleState(next);
  }

  useEffect(() => {
    if (quote) {
      setLifecycle(createCheckoutQuoteLifecycleState(quote));
      if ((quote.shipping.status === 'ready' || quote.shipping.status === 'unsupported_destination') && quote.shipping.countryCode) {
        const countryCode = quote.shipping.countryCode;
        setShippingAddress((current) => ({...current, countryCode: current.countryCode || countryCode}));
      }
    }
  }, [quote]);

  const physicalCount = acceptedQuote?.lines.filter((line) => line.fulfillmentType === 'physical' && line.quantity > 0).length ?? 0;
  const shippingAddressReady = canSubmitAcceptedQuote(lifecycle, physicalCount > 0 ? shippingAddress : null);
  const readyToSubmit =
    Boolean(acceptedQuote) &&
    acceptedQuote?.status === 'ready' &&
    acceptedQuote.shipping.status !== 'not_calculated' &&
    (physicalCount === 0 || acceptedQuote.shipping.status === 'ready') &&
    shippingAddressReady &&
    contactReady &&
    !submitting;
  const submitIssues = Array.from(
    new Set(
      [
        !acceptedQuote || acceptedQuote.lines.length === 0 ? t.missingQuote : null,
        !contactReady ? t.missingContact : null,
        physicalCount > 0 && !shippingAddressReady ? t.missingShipping : null,
        physicalCount > 0 && acceptedQuote?.shipping.status === 'not_calculated' ? t.missingShipping : null,
        physicalCount > 0 && acceptedQuote?.shipping.status === 'unsupported_destination' ? t.unsupportedShipping : null
      ].filter(Boolean) as string[]
    )
  );

  async function requestQuote(destination: QuoteDestination, nextAddress?: ShippingAddress) {
    const current = lifecycleRef.current;
    const transition = beginQuoteRequest(current, destination);
    setLifecycle(transition.state);
    if (nextAddress) setShippingAddress(nextAddress);
    try {
      const baseQuote = current.acceptedQuote;
      const result = await refreshCheckoutQuoteAction({
        locale,
        market: baseQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
        lines: baseQuote?.lines.map((line) => ({
          productId: line.productId, variantId: line.variantId, quantity: line.requestedQuantity,
          marketAtAdd: line.marketAtAdd, addedAt: baseQuote.quotedAt, updatedAt: baseQuote.quotedAt
        })) ?? cart?.lines ?? [],
        destinationCountryCode: destination.countryCode,
        destinationRegionCode: destination.regionCode,
        shippingQuoteVersion: 2,
        discountCode: baseQuote?.discount.status === 'applied' || baseQuote?.discount.status === 'not_eligible' ? baseQuote.discount.code : null,
        priorAcceptedQuoteHash: baseQuote?.hash ?? null
      });
      const latest = lifecycleRef.current;
      const settled = result.status === 'success'
        ? settleQuoteRequest(latest, transition.request.requestId, {status: 'ready', quote: result.quote})
        : settleQuoteRequest(latest, transition.request.requestId, {status: result.status === 'invalid' ? 'server_error' : 'network_error', code: result.code});
      setLifecycle(settled);
    } catch {
      setLifecycle(settleQuoteRequest(lifecycleRef.current, transition.request.requestId, {status: 'network_error'}));
    }
  }

  function acceptExternalQuote(nextQuote: CartQuote) {
    setLifecycle(createCheckoutQuoteLifecycleState(nextQuote, lifecycleRef.current.destination));
  }

  async function submit() {
    setSubmitAttempted(true);
    if (!readyToSubmit) {
      return;
    }
    if (!acceptedQuote || !cart) {
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    const submitInput = {
      locale,
      market: acceptedQuote.market,
      lines: cart.lines,
      acceptedQuote,
      acceptedQuoteHash: acceptedQuote.hash,
      idempotencyKey: `${acceptedQuote.hash.slice(0, 32)}-${email.trim().toLowerCase()}`,
      contactEmail: email.trim(),
      paymentIntent,
      destinationCountryCode:
        acceptedQuote.shipping.status === 'ready' || acceptedQuote.shipping.status === 'unsupported_destination'
          ? acceptedQuote.shipping.countryCode
          : null,
      shippingAddress: physicalCount > 0 ? shippingAddress : null,
      discountCode: acceptedQuote.discount.status === 'applied' || acceptedQuote.discount.status === 'not_eligible' ? acceptedQuote.discount.code : null
    };
    const prepared = await prepareGuestCheckoutRecoveryAction({
      acceptedQuoteHash: submitInput.acceptedQuoteHash,
      contactEmail: submitInput.contactEmail,
      paymentIntent: submitInput.paymentIntent
    });
    const result = prepared.status === 'ready'
      ? await submitCheckoutAction(submitInput)
      : ({status: 'invalid', code: prepared.code} as const);
    setSubmitResult(result);
    setSubmitting(false);
    if (result.status === 'success') {
      router.push(result.orderPath);
    }
  }

  return (
    <main className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <section className="grid content-start gap-5">
        <div className="max-w-3xl space-y-2 border-b border-[var(--border)] pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {t.review}
          </p>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--foreground)]">{t.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t.intro}</p>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t.pendingBoundary}</p>
        </div>
        {!acceptedQuote || acceptedQuote.lines.length === 0 ? <Alert variant="warning">{t.empty}</Alert> : null}
        <Card className="shadow-none">
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="text-lg">{t.contact}</CardTitle>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.contactIntro}</p>
          </CardHeader>
          <CardContent className="pt-1">
            <ContactForm
              locale={locale}
              email={email}
              paymentIntent={paymentIntent}
              onEmailChange={setEmail}
              onPaymentIntentChange={setPaymentIntent}
              onValidityChange={setContactReady}
              showValidation={submitAttempted}
            />
          </CardContent>
        </Card>
        {physicalCount > 0 ? (
          <Card className="shadow-none">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <CardTitle className="text-lg">{t.destination}</CardTitle>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.destinationIntro}</p>
            </CardHeader>
            <CardContent className="pt-1">
              {savedAddresses.length > 0 ? (
                <div className="mb-5">
                  <SavedAddressSelector
                    locale={locale}
                    addresses={savedAddresses}
                    pending={lifecycle.activeRequestId !== null}
                    onApply={(address) => requestQuote({countryCode: address.countryCode, regionCode: address.region}, address)}
                  />
                </div>
              ) : null}
              <DestinationForm
                locale={locale}
                shippingAddress={shippingAddress}
                lifecycle={lifecycle}
                showValidation={submitAttempted}
                onShippingAddressChange={setShippingAddress}
                onDestinationChange={requestQuote}
              />
            </CardContent>
          </Card>
        ) : null}
        <Card className="shadow-none">
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <CardTitle className="text-lg">{t.discount}</CardTitle>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.discountIntro}</p>
          </CardHeader>
          <CardContent className="pt-1">
            <DiscountCodeForm locale={locale} acceptedQuote={acceptedQuote} onAcceptedQuote={acceptExternalQuote} />
          </CardContent>
        </Card>
        {submitResult?.status === 'success' ? (
          <Alert variant="success">
            {t.success} {t.deadline}: {new Date(submitResult.reservationExpiresAt).toLocaleString(locale)}.
          </Alert>
        ) : null}
        {submitResult && submitResult.status !== 'success' ? (
          <Alert variant={submitResult.status === 'stale' ? 'warning' : 'destructive'}>
            {submitResult.status === 'invalid' ? t.invalid : submitResult.status === 'stale' ? t.stale : t.conflict}
          </Alert>
        ) : null}
      </section>
      <aside className="lg:sticky lg:top-24">
        <div className="grid gap-4">
          <OrderSummary quote={acceptedQuote} locale={locale} />
          {submitAttempted && submitIssues.length > 0 ? (
            <Alert variant="warning" className="text-sm">
              <p className="font-semibold text-[var(--foreground)]">{t.completeThese}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {submitIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <Button
            disabled={submitting || !acceptedQuote || acceptedQuote.lines.length === 0}
            onClick={submit}
            aria-disabled={!readyToSubmit || submitting}
            className="w-full"
          >
            {submitting ? t.submitting : t.handoff}
          </Button>
          {policyLinks.length > 0 ? (
            <div className="grid gap-2 text-sm text-[var(--muted-foreground)]">
              <p className="font-semibold text-[var(--foreground)]">{t.policies}</p>
              <div className="flex flex-wrap gap-3">
                {policyLinks.map((policy) => (
                  <a key={policy.policyKind} href={policy.href} className="font-semibold text-[var(--accent)]">
                    {policy.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
      {lifecycle.proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={lifecycle.proposal.quote}
          changes={lifecycle.proposal.materialChanges}
          onConfirm={() => setLifecycle(acceptQuoteProposal(lifecycleRef.current))}
          onCancel={() => setLifecycle(reviewDestination(lifecycleRef.current, lifecycleRef.current.destination))}
        />
      ) : null}
    </main>
  );
}
