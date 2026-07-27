'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, Check, MapPin, ShoppingBag} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  customerAddressToShippingAddress,
  type CustomerShippingAddress
} from '@/account/addresses';
import {
  prepareGuestCheckoutRecoveryAction,
  refreshCheckoutQuoteAction,
  submitCheckoutAction,
  type SubmitCheckoutActionState
} from '@/checkout/actions';
import {checkoutPaymentIntentForQuote} from '@/checkout/payment-method';
import {
  canAcceptPrefilledQuoteWithoutReview,
  checkoutPrefillDestination
} from '@/checkout/prefill';
import {
  acceptQuoteProposal,
  beginQuoteRequest,
  canSubmitAcceptedQuote,
  createCheckoutQuoteLifecycleState,
  reviewDestination,
  shouldRequoteUpstreamForDestination,
  settleQuoteRequest,
  type CheckoutQuoteLifecycleState,
  type QuoteDestination
} from '@/checkout/quote-lifecycle';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';
import {useCart} from '@/components/cart/cart-provider';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {getCartPath, getCatalogPath, type Locale} from '@/i18n/routing';
import {ContactForm} from './contact-form';
import {DestinationForm} from './destination-form';
import {MobileCheckoutDock, OrderSummary} from './order-summary';
import {QuoteDiffDialog} from './quote-diff-dialog';
import {SavedAddressSelector} from './saved-address-selector';

const copy = {
  en: {
    title: 'Checkout',
    intro: 'Confirm your contact, delivery details, and current total.',
    backToCart: 'Back to cart',
    contact: 'Contact email',
    contactIntro: 'Order and payment updates',
    destination: 'Delivery address',
    destinationIntro: 'Shipping is recalculated when the country or state changes.',
    changeAddress: 'Change',
    calculating: 'Calculating shipping for this address…',
    handoff: 'Confirm total and continue',
    paypalHandoff: 'Create order and continue to PayPal',
    vietqrHandoff: 'Create order and view VietQR',
    submitting: 'Creating order…',
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item before starting checkout.',
    continueShopping: 'Continue shopping',
    missingContact: 'Enter a valid contact email.',
    missingQuote: 'Refresh the cart quote.',
    missingPayment: 'Wait for the payment method to match the confirmed total.',
    missingShipping: 'Complete the delivery address.',
    unsupportedShipping: 'Choose a supported shipping destination.',
    invalid: 'Check your contact details and cart before continuing.',
    stale: 'The quote changed. Review the updated total and try again.',
    conflict: 'Checkout could not reserve the current items. Review your cart and try again.',
    success: 'Order is awaiting payment.',
    deadline: 'Reservation deadline'
  },
  vi: {
    title: 'Thanh toán',
    intro: 'Xác nhận email, địa chỉ giao hàng và tổng tiền hiện tại.',
    backToCart: 'Quay lại giỏ hàng',
    contact: 'Email nhận đơn',
    contactIntro: 'Nhận cập nhật đơn hàng và hướng dẫn thanh toán',
    destination: 'Địa chỉ giao hàng',
    destinationIntro: 'Phí giao hàng được tính lại khi quốc gia hoặc bang thay đổi.',
    changeAddress: 'Thay đổi',
    calculating: 'Đang tính phí giao hàng cho địa chỉ này…',
    handoff: 'Xác nhận tổng tiền và tiếp tục',
    paypalHandoff: 'Tạo đơn và tiếp tục tới PayPal',
    vietqrHandoff: 'Tạo đơn và xem mã VietQR',
    submitting: 'Đang tạo đơn…',
    emptyTitle: 'Giỏ hàng đang trống',
    emptyBody: 'Hãy thêm mẫu PDF hoặc sản phẩm thủ công trước khi thanh toán.',
    continueShopping: 'Tiếp tục mua sắm',
    missingContact: 'Nhập email liên hệ hợp lệ.',
    missingQuote: 'Cập nhật lại báo giá giỏ hàng.',
    missingPayment: 'Chờ phương thức thanh toán khớp với tổng tiền đã xác nhận.',
    missingShipping: 'Hoàn tất địa chỉ giao hàng.',
    unsupportedShipping: 'Chọn địa chỉ giao hàng được hỗ trợ.',
    invalid: 'Kiểm tra thông tin liên hệ và giỏ hàng trước khi tiếp tục.',
    stale: 'Báo giá đã thay đổi. Hãy xem lại tổng tiền và thử lại.',
    conflict: 'Không thể giữ các sản phẩm hiện tại. Hãy xem lại giỏ hàng và thử lại.',
    success: 'Đơn hàng đang chờ thanh toán.',
    deadline: 'Hạn giữ hàng'
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

function preferredAddress(addresses: CustomerShippingAddress[]) {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

function quoteDestination(quote: CartQuote): QuoteDestination | null {
  if (
    quote.shipping.status !== 'ready' &&
    quote.shipping.status !== 'unsupported_destination'
  ) {
    return null;
  }
  return {
    countryCode: quote.shipping.countryCode,
    regionCode: quote.shipping.regionCode ?? null
  };
}

function quoteMatchesDestination(quote: CartQuote, destination: QuoteDestination) {
  const quoted = quoteDestination(quote);
  if (!quoted || quoted.countryCode !== destination.countryCode) return false;
  return quoted.countryCode !== 'US' || quoted.regionCode === destination.regionCode;
}

function addressesEqual(left: ShippingAddress, right: ShippingAddress) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function CheckoutPage({
  locale,
  initialEmail = '',
  savedAddresses = [],
  policyLinks = []
}: {
  locale: Locale;
  initialEmail?: string;
  savedAddresses?: CustomerShippingAddress[];
  policyLinks?: CheckoutPolicyLink[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const {quote, cart, pending} = useCart();
  const savedAddress = useMemo(() => preferredAddress(savedAddresses), [savedAddresses]);
  const savedShippingAddress = useMemo(
    () => (savedAddress ? customerAddressToShippingAddress(savedAddress) : null),
    [savedAddress]
  );
  const [lifecycle, setLifecycleState] = useState(() =>
    createCheckoutQuoteLifecycleState(quote)
  );
  const lifecycleRef = useRef(lifecycle);
  const destinationAuthorityRef = useRef(false);
  const prefillRequestRef = useRef<string | null>(null);
  const idempotencyRef = useRef<{quoteHash: string; key: string} | null>(null);
  const acceptedQuote = lifecycle.acceptedQuote;
  const [email, setEmail] = useState(initialEmail);
  const [contactReady, setContactReady] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(
    savedShippingAddress ?? emptyShippingAddress
  );
  const shippingAddressRef = useRef(shippingAddress);
  const [destinationExpanded, setDestinationExpanded] = useState(!savedShippingAddress);
  const [submitResult, setSubmitResult] = useState<SubmitCheckoutActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const paymentIntent = checkoutPaymentIntentForQuote(acceptedQuote);

  const setLifecycle = useCallback((next: CheckoutQuoteLifecycleState) => {
    lifecycleRef.current = next;
    setLifecycleState(next);
  }, []);

  const setShippingAddressState = useCallback((next: ShippingAddress) => {
    shippingAddressRef.current = next;
    setShippingAddress(next);
  }, []);

  const requestQuote = useCallback(
    async (
      destination: QuoteDestination,
      nextAddress?: ShippingAddress,
      upstreamQuote?: CartQuote,
      source: 'destination' | 'upstream' | 'prefill' = 'destination'
    ) => {
      if (source !== 'upstream') {
        destinationAuthorityRef.current = Boolean(destination.countryCode);
      }
      const current = lifecycleRef.current;
      const transition = beginQuoteRequest(current, destination);
      setLifecycle(transition.state);
      if (nextAddress) setShippingAddressState(nextAddress);
      try {
        const baseQuote = upstreamQuote ?? current.acceptedQuote;
        const result = await refreshCheckoutQuoteAction({
          locale,
          market: baseQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
          lines:
            baseQuote?.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.requestedQuantity,
              marketAtAdd: line.marketAtAdd,
              addedAt: baseQuote.quotedAt,
              updatedAt: baseQuote.quotedAt
            })) ??
            cart?.lines ??
            [],
          destinationCountryCode: destination.countryCode,
          destinationRegionCode: destination.regionCode,
          shippingQuoteVersion: 2,
          discountCode:
            baseQuote?.discount.status === 'applied' ||
            baseQuote?.discount.status === 'not_eligible'
              ? baseQuote.discount.code
              : null,
          priorAcceptedQuoteHash: current.acceptedQuote?.hash ?? null
        });
        const latest = lifecycleRef.current;
        const settlementState =
          source === 'prefill' &&
          result.status === 'success' &&
          latest.acceptedQuote &&
          canAcceptPrefilledQuoteWithoutReview(
            latest.acceptedQuote.market,
            result.quote.market
          )
            ? {...latest, acceptedQuote: null}
            : latest;
        const settled =
          result.status === 'success'
            ? settleQuoteRequest(settlementState, transition.request.requestId, {
                status: 'ready',
                quote: result.quote
              })
            : settleQuoteRequest(settlementState, transition.request.requestId, {
                status: result.status === 'invalid' ? 'server_error' : 'network_error',
                code: result.code
              });
        setLifecycle(settled);
      } catch {
        setLifecycle(
          settleQuoteRequest(lifecycleRef.current, transition.request.requestId, {
            status: 'network_error'
          })
        );
      }
    },
    [cart?.lines, locale, setLifecycle, setShippingAddressState]
  );

  useEffect(() => {
    if (!quote) return;
    const hasPhysical = quote.lines.some(
      (line) => line.fulfillmentType === 'physical' && line.requestedQuantity > 0
    );
    const currentDestination = lifecycleRef.current.destination;
    const preserveDestination = shouldRequoteUpstreamForDestination(
      quote,
      destinationAuthorityRef.current,
      currentDestination
    );

    if (preserveDestination) {
      void requestQuote(currentDestination, undefined, quote, 'upstream');
      return;
    }

    if (!hasPhysical) {
      destinationAuthorityRef.current = false;
      prefillRequestRef.current = null;
      setLifecycle(createCheckoutQuoteLifecycleState(quote));
      return;
    }

    const prefill = checkoutPrefillDestination({
      market: quote.market,
      savedDestination: savedShippingAddress
        ? {
            countryCode: savedShippingAddress.countryCode,
            regionCode: savedShippingAddress.region
          }
        : null,
      quotedDestination: quoteDestination(quote)
    });
    const nextAddress = savedShippingAddress
      ? savedShippingAddress
      : {
          ...shippingAddressRef.current,
          countryCode: prefill.countryCode ?? '',
          region: prefill.regionCode
        };
    const destination = {
      countryCode: prefill.countryCode,
      regionCode: prefill.regionCode
    };

    if (!addressesEqual(shippingAddressRef.current, nextAddress)) {
      setShippingAddressState(nextAddress);
    }
    setLifecycle(createCheckoutQuoteLifecycleState(quote, destination));

    if (!destination.countryCode) return;
    destinationAuthorityRef.current = true;
    if (quoteMatchesDestination(quote, destination)) return;

    const requestKey = `${quote.hash}:${destination.countryCode}:${destination.regionCode ?? ''}`;
    if (prefillRequestRef.current === requestKey) return;
    prefillRequestRef.current = requestKey;
    void requestQuote(destination, nextAddress, quote, 'prefill');
  }, [quote, requestQuote, savedShippingAddress, setLifecycle, setShippingAddressState]);

  const physicalCount =
    acceptedQuote?.lines.filter(
      (line) => line.fulfillmentType === 'physical' && line.quantity > 0
    ).length ?? 0;
  const shippingAddressReady = canSubmitAcceptedQuote(
    lifecycle,
    physicalCount > 0 ? shippingAddress : null
  );
  const readyToSubmit =
    Boolean(acceptedQuote) &&
    acceptedQuote?.status === 'ready' &&
    acceptedQuote.shipping.status !== 'not_calculated' &&
    (physicalCount === 0 || acceptedQuote.shipping.status === 'ready') &&
    shippingAddressReady &&
    contactReady &&
    paymentIntent !== null &&
    !submitting;
  const submitIssues = Array.from(
    new Set(
      [
        !acceptedQuote || acceptedQuote.lines.length === 0 ? t.missingQuote : null,
        !contactReady ? t.missingContact : null,
        !paymentIntent ? t.missingPayment : null,
        physicalCount > 0 && !shippingAddressReady ? t.missingShipping : null,
        physicalCount > 0 && acceptedQuote?.shipping.status === 'not_calculated'
          ? t.missingShipping
          : null,
        physicalCount > 0 &&
        acceptedQuote?.shipping.status === 'unsupported_destination'
          ? t.unsupportedShipping
          : null
      ].filter(Boolean) as string[]
    )
  );
  const actionDisabled =
    submitting ||
    !acceptedQuote ||
    acceptedQuote.lines.length === 0 ||
    acceptedQuote.status !== 'ready' ||
    lifecycle.activeRequestId !== null ||
    Boolean(lifecycle.proposal) ||
    Boolean(lifecycle.issue) ||
    paymentIntent === null ||
    (physicalCount > 0 && acceptedQuote.shipping.status !== 'ready');
  const actionLabel = submitting
    ? t.submitting
    : paymentIntent === 'paypal_intent'
      ? t.paypalHandoff
      : paymentIntent === 'vietqr_intent'
        ? t.vietqrHandoff
        : t.handoff;
  const isEmpty =
    acceptedQuote?.status === 'empty' ||
    (!pending && Boolean(cart) && (cart?.lines.length ?? 0) === 0);

  function acceptExternalQuote(nextQuote: CartQuote) {
    setLifecycle(createCheckoutQuoteLifecycleState(nextQuote, lifecycleRef.current.destination));
  }

  function idempotencyKeyForQuote(quoteHash: string) {
    if (idempotencyRef.current?.quoteHash === quoteHash) {
      return idempotencyRef.current.key;
    }
    const key = `checkout-${quoteHash.slice(0, 24)}-${globalThis.crypto.randomUUID()}`;
    idempotencyRef.current = {quoteHash, key};
    return key;
  }

  function focusFirstIncompleteField() {
    if (!contactReady) {
      document.getElementById('checkout-email')?.focus();
      return;
    }
    if (physicalCount > 0 && !shippingAddressReady) {
      setDestinationExpanded(true);
      window.requestAnimationFrame(() => {
        const targetId = !shippingAddress.countryCode
          ? 'shipping-country-trigger'
          : !shippingAddress.recipientName
            ? 'shipping-recipient-name'
            : !shippingAddress.phoneNumber
              ? 'shipping-phone-number'
              : !shippingAddress.addressLine1
                ? 'shipping-address-line-1'
                : shippingAddress.countryCode === 'US' && !shippingAddress.region
                  ? 'shipping-region-trigger'
                  : 'shipping-country-trigger';
        document.getElementById(targetId)?.focus();
      });
    }
  }

  async function submit() {
    setSubmitAttempted(true);
    if (!readyToSubmit) {
      focusFirstIncompleteField();
      return;
    }
    if (!acceptedQuote || !cart || !paymentIntent) return;

    setSubmitting(true);
    setSubmitResult(null);
    const submitInput = {
      locale,
      market: acceptedQuote.market,
      lines: cart.lines,
      acceptedQuote,
      acceptedQuoteHash: acceptedQuote.hash,
      idempotencyKey: idempotencyKeyForQuote(acceptedQuote.hash),
      contactEmail: email.trim(),
      paymentIntent,
      destinationCountryCode:
        acceptedQuote.shipping.status === 'ready' ||
        acceptedQuote.shipping.status === 'unsupported_destination'
          ? acceptedQuote.shipping.countryCode
          : null,
      shippingAddress: physicalCount > 0 ? shippingAddress : null,
      discountCode:
        acceptedQuote.discount.status === 'applied' ||
        acceptedQuote.discount.status === 'not_eligible'
          ? acceptedQuote.discount.code
          : null
    };
    const prepared = await prepareGuestCheckoutRecoveryAction({
      acceptedQuote,
      acceptedQuoteHash: submitInput.acceptedQuoteHash,
      contactEmail: submitInput.contactEmail,
      paymentIntent: submitInput.paymentIntent
    });
    const result =
      prepared.status === 'ready'
        ? await submitCheckoutAction(submitInput)
        : ({status: 'invalid', code: prepared.code} as const);
    setSubmitResult(result);
    setSubmitting(false);
    if (result.status === 'success') router.push(result.orderPath);
  }

  if (isEmpty) {
    return (
      <main className="container grid gap-5 py-7 lg:py-9">
        <div className="grid max-w-[68ch] gap-1.5">
          <Link href={getCartPath(locale)} className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.backToCart}
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight">{t.title}</h1>
        </div>
        <Card className="grid max-w-2xl justify-items-center gap-4 bg-[var(--surface-paper)] px-5 py-10 text-center shadow-[0_18px_54px_rgb(73_52_32/8%)]">
          <span className="grid size-16 place-items-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--accent)] ring-1 ring-[var(--border)]/60">
            <ShoppingBag aria-hidden="true" className="size-7" strokeWidth={1.6} />
          </span>
          <div className="grid gap-1.5">
            <h2 className="text-xl font-semibold">{t.emptyTitle}</h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.emptyBody}</p>
          </div>
          <Link
            href={getCatalogPath(locale)}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {t.continueShopping}
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="container grid gap-5 pb-28 pt-6 lg:gap-6 lg:pb-10 lg:pt-8">
      <header className="grid max-w-[72ch] gap-1.5">
        <Link href={getCartPath(locale)} className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.backToCart}
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">{t.title}</h1>
        <p className="text-pretty text-sm leading-6 text-[var(--muted-foreground)]">{t.intro}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-7">
        <section className="grid content-start gap-4">
          <Card className="overflow-hidden bg-[var(--surface-paper)] shadow-none">
            <CardContent className="space-y-0 p-0">
              <section aria-labelledby="checkout-contact-heading" className="grid gap-3 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="checkout-contact-heading" className="text-base font-semibold">{t.contact}</h2>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">{t.contactIntro}</p>
                  </div>
                  {contactReady ? <Check aria-label="Complete" className="mt-0.5 size-4 shrink-0 text-[var(--success)]" /> : null}
                </div>
                <ContactForm
                  locale={locale}
                  email={email}
                  onEmailChange={setEmail}
                  onValidityChange={setContactReady}
                  showValidation={submitAttempted}
                />
              </section>

              {physicalCount > 0 ? (
                <>
                  <Separator className="border-[var(--border)]/70" />
                  <section aria-labelledby="checkout-destination-heading" className="grid gap-4 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 id="checkout-destination-heading" className="text-base font-semibold">{t.destination}</h2>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">{t.destinationIntro}</p>
                      </div>
                      {shippingAddressReady ? <Check aria-label="Complete" className="mt-0.5 size-4 shrink-0 text-[var(--success)]" /> : null}
                    </div>

                    {!destinationExpanded && shippingAddress.countryCode ? (
                      <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3">
                        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{shippingAddress.recipientName || savedAddress?.label}</p>
                          <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
                            {[shippingAddress.addressLine1, shippingAddress.locality, shippingAddress.region, shippingAddress.countryCode].filter(Boolean).join(', ')}
                          </p>
                          {lifecycle.activeRequestId !== null ? (
                            <p className="mt-1 text-xs font-medium text-[var(--accent)]">{t.calculating}</p>
                          ) : null}
                        </div>
                        <Button type="button" variant="ghost" className="min-h-10 shrink-0 px-2 text-sm" onClick={() => setDestinationExpanded(true)}>
                          {t.changeAddress}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {savedAddresses.length > 0 ? (
                          <SavedAddressSelector
                            locale={locale}
                            addresses={savedAddresses}
                            pending={lifecycle.activeRequestId !== null}
                            onApply={(address) => {
                              setDestinationExpanded(false);
                              void requestQuote(
                                {countryCode: address.countryCode, regionCode: address.region},
                                address
                              );
                            }}
                          />
                        ) : null}
                        <DestinationForm
                          locale={locale}
                          shippingAddress={shippingAddress}
                          lifecycle={lifecycle}
                          showValidation={submitAttempted}
                          onShippingAddressChange={setShippingAddressState}
                          onDestinationChange={(destination) => void requestQuote(destination)}
                        />
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </CardContent>
          </Card>

          {submitResult?.status === 'success' ? (
            <Alert variant="success">
              {t.success} {t.deadline}: {new Date(submitResult.reservationExpiresAt).toLocaleString(locale)}.
            </Alert>
          ) : null}
          {submitResult && submitResult.status !== 'success' ? (
            <Alert variant={submitResult.status === 'stale' ? 'warning' : 'destructive'}>
              {submitResult.status === 'invalid'
                ? t.invalid
                : submitResult.status === 'stale'
                  ? t.stale
                  : t.conflict}
            </Alert>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            quote={acceptedQuote}
            locale={locale}
            paymentIntent={paymentIntent}
            shippingAddress={shippingAddress}
            submitIssues={submitIssues}
            showSubmitIssues={submitAttempted}
            actionLabel={actionLabel}
            actionDisabled={actionDisabled}
            onSubmit={() => void submit()}
            policyLinks={policyLinks}
            onAcceptedQuote={acceptExternalQuote}
          />
        </aside>
      </div>

      <MobileCheckoutDock
        quote={acceptedQuote}
        locale={locale}
        label={actionLabel}
        disabled={actionDisabled}
        onSubmit={() => void submit()}
      />

      {lifecycle.proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={lifecycle.proposal.quote}
          changes={lifecycle.proposal.materialChanges}
          onConfirm={() => setLifecycle(acceptQuoteProposal(lifecycleRef.current))}
          onCancel={() =>
            setLifecycle(
              reviewDestination(lifecycleRef.current, lifecycleRef.current.destination)
            )
          }
        />
      ) : null}
    </main>
  );
}
