'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Check, MapPin, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTranslator } from 'next-intl';
import {
  customerAddressToShippingAddress,
  type CustomerShippingAddress
} from '@/account/addresses';
import { saveCheckoutShippingAddressAction } from '@/account/address-actions';
import { formatMoney } from '@/catalog/money';
import {
  prepareGuestCheckoutRecoveryAction,
  refreshCheckoutQuoteAction,
  submitCheckoutAction
} from '@/checkout/actions';
import {
  createCheckoutSession,
  type ActionBlockerCode,
  type CheckoutFocusTarget,
  type CheckoutSession,
  type CheckoutSessionConfig,
  type CheckoutSessionPorts,
  type OrderCreatedEvent,
  type ReadinessIssueCode,
  type UpstreamCartState
} from '@/checkout/checkout-session';
import type { ShippingAddress } from '@/checkout/shipping-address';
import { validateCheckoutShippingAddress } from '@/checkout/shipping-address-ui';
import { useCart } from '@/components/cart/cart-provider';
import { IncidentReference } from '@/components/support/incident-reference';
import { SupportLinks, type PublicSupportConfig } from '@/components/support/support-links';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  getAccountOrdersPath,
  getCartPath,
  getCatalogPath,
  getCheckoutPath,
  getContactPath,
  getGuestOrderPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import { ContactForm } from './contact-form';
import { DestinationForm } from './destination-form';
import {
  buildOrderSummaryViewModel,
  MobileCheckoutDock,
  MobileOrderSummary,
  OrderSummary
} from './order-summary';
import { QuoteDiffDialog } from './quote-diff-dialog';
import { SavedAddressSelector } from './saved-address-selector';
import { CheckoutStepper } from './checkout-stepper';

type CheckoutPolicyLink = {
  policyKind: string;
  title: string;
  href: string;
};

function preferredAddress(addresses: CustomerShippingAddress[]) {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

function checkoutSessionStorage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Blocked storage (private mode / cookie policy) must not break checkout.
    return null;
  }
}

function buildSessionInstance(
  config: CheckoutSessionConfig,
  portsRef: { current: CheckoutSessionPorts }
): CheckoutSession {
  return createCheckoutSession(config, {
    refreshQuote: (input) => portsRef.current.refreshQuote(input),
    prepareGuestRecovery: (input) => portsRef.current.prepareGuestRecovery(input),
    submitOrder: (input) => portsRef.current.submitOrder(input),
    saveShippingAddress: (input) => portsRef.current.saveShippingAddress(input),
    getStorage: () => portsRef.current.getStorage(),
    onOrderCreated: (event) => portsRef.current.onOrderCreated(event)
  });
}

function useCheckoutSession(
  config: CheckoutSessionConfig,
  ports: CheckoutSessionPorts,
  upstreamCart: UpstreamCartState,
  savedShippingAddress: ShippingAddress | null,
  isSignedIn: boolean
) {
  const configRef = useRef(config);
  configRef.current = config;
  const portsRef = useRef(ports);
  portsRef.current = ports;

  const disposedSessionsRef = useRef(new WeakSet<CheckoutSession>());
  const [session, setSession] = useState<CheckoutSession>(() =>
    buildSessionInstance(configRef.current, portsRef)
  );
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );

  useEffect(() => {
    if (disposedSessionsRef.current.has(session)) {
      setSession(buildSessionInstance(configRef.current, portsRef));
      return;
    }
    session.hydrateDraft();
    return () => {
      disposedSessionsRef.current.add(session);
      session.dispose();
    };
  }, [session]);

  useEffect(() => {
    if (disposedSessionsRef.current.has(session)) return;
    session.syncCart(upstreamCart, { savedShippingAddress, isSignedIn });
  }, [session, upstreamCart, savedShippingAddress, isSignedIn]);

  return { session, snapshot };
}

function focusDestinationField(shippingAddress: ShippingAddress, locale: Locale) {
  window.requestAnimationFrame(() => {
    const errors = validateCheckoutShippingAddress(shippingAddress, locale);
    const orderedFields: Array<[keyof ShippingAddress, string]> = [
      ['countryCode', 'shipping-country-trigger'],
      ['recipientName', 'shipping-recipient-name'],
      ['phoneNumber', 'shipping-phone-number'],
      ...(shippingAddress.countryCode === 'VN'
        ? ([
            ['region', 'shipping-region-trigger'],
            ['locality', 'shipping-locality-trigger'],
            ['addressLine1', 'shipping-address-line-1']
          ] as Array<[keyof ShippingAddress, string]>)
        : shippingAddress.countryCode === 'US'
          ? ([
              ['region', 'shipping-region-trigger'],
              ['postalCode', 'shipping-postal-code'],
              ['addressLine1', 'shipping-address-line-1']
            ] as Array<[keyof ShippingAddress, string]>)
          : ([['addressLine1', 'shipping-address-line-1']] as Array<
              [keyof ShippingAddress, string]
            >))
    ];
    const targetId =
      orderedFields.find(([field]) => errors[field])?.[1] ?? 'shipping-country-trigger';
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  });
}

function focusField(
  target: CheckoutFocusTarget | null,
  shippingAddress: ShippingAddress,
  locale: Locale
) {
  if (target === 'contact') {
    document.getElementById('checkout-email')?.focus();
    return;
  }
  if (target === 'destination') {
    focusDestinationField(shippingAddress, locale);
  }
}

export function CheckoutPage({
  locale,
  draftScope,
  initialEmail = '',
  savedAddresses = [],
  policyLinks = [],
  isSignedIn = false,
  publicSupportConfig
}: {
  locale: Locale;
  draftScope: string;
  initialEmail?: string;
  savedAddresses?: CustomerShippingAddress[];
  policyLinks?: CheckoutPolicyLink[];
  isSignedIn?: boolean;
  publicSupportConfig?: PublicSupportConfig;
}) {
  const router = useRouter();
  const pageTranslate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.page'
  });
  const submitTranslate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.submit'
  });
  const ordersTranslate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'orders'
  });
  const t = {
    title: pageTranslate('title'),
    intro: pageTranslate('intro'),
    backToCart: pageTranslate('backToCart'),
    contact: pageTranslate('contact'),
    contactIntro: pageTranslate('contactIntro'),
    complete: pageTranslate('complete'),
    destination: pageTranslate('destination'),
    destinationIntro: pageTranslate('destinationIntro'),
    changeAddress: pageTranslate('changeAddress'),
    calculating: pageTranslate('calculating'),
    emptyTitle: pageTranslate('emptyTitle'),
    emptyBody: pageTranslate('emptyBody'),
    continueShopping: pageTranslate('continueShopping'),
    success: pageTranslate('success'),
    deadline: pageTranslate('deadline'),
    retryQuote: pageTranslate('retry'),
    saveAddress: pageTranslate('saveAddress'),
    addressSaveWarning: pageTranslate('addressSaveWarning'),
    signInPrompt: pageTranslate('signInPrompt'),
    signInAction: pageTranslate('signInAction'),
    shippingCalculated: (amount: string) => pageTranslate('shippingCalculated', { amount }),
    shippingUpdated: (previous: string, current: string) =>
      pageTranslate('shippingUpdated', { previous, current }),
    handoff: submitTranslate('handoff'),
    paypalHandoff: submitTranslate('paypal'),
    vietqrHandoff: submitTranslate('vietqr'),
    checkingTotal: submitTranslate('checkingTotal'),
    submitting: submitTranslate('creatingOrder'),
    missingContact: submitTranslate('missingContact'),
    missingQuote: submitTranslate('missingTotal'),
    missingPayment: submitTranslate('missingPayment'),
    missingShipping: submitTranslate('missingShipping'),
    unsupportedShipping: submitTranslate('unsupportedShipping'),
    blockedItems: submitTranslate('blockedItems'),
    updatingTotal: submitTranslate('updatingTotal'),
    reviewUpdatedTotal: submitTranslate('reviewUpdatedTotal'),
    quoteIssue: {
      unsupported: submitTranslate('quoteUnsupported'),
      network: submitTranslate('quoteNetwork'),
      server: submitTranslate('quoteServer')
    },
    errors: {
      cookiesBlocked: submitTranslate('cookiesBlocked'),
      staleQuote: submitTranslate('staleQuote'),
      staleShipping: submitTranslate('staleShipping'),
      addressRequired: submitTranslate('addressRequired'),
      addressIncompleteUs: submitTranslate('addressIncompleteUs'),
      paymentMethodDrift: submitTranslate('paymentMethodDrift'),
      conflict: submitTranslate('conflict'),
      network: submitTranslate('network'),
      networkUnconfirmed: submitTranslate('unknownOutcome'),
      unknown: submitTranslate('unknown'),
      incidentCode: submitTranslate('incidentId')
    },
    unknownRecovery: {
      orders: ordersTranslate('actions.myOrders'),
      guest: ordersTranslate('accessDenied.recoverGuest')
    }
  };

  const { quote, cart, pending, commitPlacedOrder } = useCart();

  const savedAddress = useMemo(() => preferredAddress(savedAddresses), [savedAddresses]);
  const savedShippingAddress = useMemo(
    () => (savedAddress ? customerAddressToShippingAddress(savedAddress) : null),
    [savedAddress]
  );

  const upstreamCart = useMemo<UpstreamCartState>(
    () => ({
      quote,
      lines: cart?.lines ?? null,
      hasCart: Boolean(cart),
      pending
    }),
    [quote, cart, pending]
  );

  const [mobileSummaryExpanded, setMobileSummaryExpanded] = useState(false);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const { session, snapshot } = useCheckoutSession(
    {
      locale,
      draftScope,
      isSignedIn,
      initialEmail,
      savedShippingAddress,
      initialCart: upstreamCart
    },
    {
      refreshQuote: refreshCheckoutQuoteAction,
      prepareGuestRecovery: prepareGuestCheckoutRecoveryAction,
      submitOrder: submitCheckoutAction,
      saveShippingAddress: saveCheckoutShippingAddressAction,
      getStorage: checkoutSessionStorage,
      onOrderCreated: ({ orderNumber, orderPath, completedLines }: OrderCreatedEvent) => {
        commitPlacedOrder({ orderNumber, completedLines });
        router.push(orderPath);
      }
    },
    upstreamCart,
    savedShippingAddress,
    isSignedIn
  );

  // The submit button sits in a sticky bottom dock on mobile, so feedback that
  // renders in the left column can land off-screen. Bring it into view unless
  // a field-specific error already scrolled focus to that field.
  useEffect(() => {
    const failed = snapshot.submitResult && snapshot.submitResult.status !== 'success';
    if (!failed && !snapshot.destinationStatus.issue) return;
    if (failed && snapshot.submitError?.focusTarget) return;
    const node = feedbackRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.focus({ preventScroll: true });
  }, [snapshot.destinationStatus.issue, snapshot.submitError, snapshot.submitResult]);

  const issueCopy: Record<ReadinessIssueCode, string> = {
    missing_quote: t.missingQuote,
    missing_contact: t.missingContact,
    missing_payment: t.missingPayment,
    missing_shipping: t.missingShipping,
    unsupported_shipping: t.unsupportedShipping
  };

  const blockerCopy: Record<ActionBlockerCode, string> = {
    updating_total: t.updatingTotal,
    review_updated_total: t.reviewUpdatedTotal,
    blocked_items: t.blockedItems,
    quote_unsupported: t.quoteIssue.unsupported,
    quote_network: t.quoteIssue.network,
    quote_server: t.quoteIssue.server
  };

  const submitIssues = snapshot.readinessIssues.map((code) => issueCopy[code]);
  const actionBlocker = snapshot.actionBlocker ? blockerCopy[snapshot.actionBlocker] : null;
  const quoteIssueText = snapshot.destinationStatus.issue
    ? snapshot.destinationStatus.issue.kind === 'unsupported'
      ? t.quoteIssue.unsupported
      : snapshot.destinationStatus.issue.kind === 'network'
        ? t.quoteIssue.network
        : t.quoteIssue.server
    : null;

  const actionLabel =
    snapshot.submitStage === 'checking-total'
      ? t.checkingTotal
      : snapshot.submitStage === 'creating-order'
        ? t.submitting
        : snapshot.paymentIntent === 'paypal_intent'
          ? t.paypalHandoff
          : snapshot.paymentIntent === 'vietqr_intent'
            ? t.vietqrHandoff
            : t.handoff;

  const orderSummaryModel = buildOrderSummaryViewModel({
    quote: snapshot.acceptedQuote,
    locale,
    paymentIntent: snapshot.paymentIntent,
    shippingAddress: snapshot.shippingAddress,
    contactEmail: snapshot.contactReady ? snapshot.email : null,
    blockingIssues: [...submitIssues, ...(actionBlocker ? [actionBlocker] : [])],
    showBlockingIssues: snapshot.submitAttempted || snapshot.actionDisabled,
    policyLinks,
    pending: snapshot.destinationStatus.isPending
  });

  const shippingNoticeText = snapshot.shippingNotice
    ? snapshot.shippingNotice.notice.kind === 'calculated'
      ? t.shippingCalculated(
          formatMoney({
            amountMinor: snapshot.shippingNotice.notice.currentAmountMinor,
            currencyCode: snapshot.shippingNotice.currencyCode
          })
        )
      : t.shippingUpdated(
          formatMoney({
            amountMinor: snapshot.shippingNotice.notice.previousAmountMinor,
            currencyCode: snapshot.shippingNotice.currencyCode
          }),
          formatMoney({
            amountMinor: snapshot.shippingNotice.notice.currentAmountMinor,
            currencyCode: snapshot.shippingNotice.currencyCode
          })
        )
    : null;

  async function handleSubmit() {
    const outcome = await session.submit();
    if (outcome.status === 'invalid' || outcome.status === 'failed') {
      focusField(outcome.focusTarget, session.getSnapshot().shippingAddress, locale);
    }
  }

  async function handleAcceptProposal() {
    const outcome = await session.acceptProposalAndResume();
    if (outcome.status === 'invalid' || outcome.status === 'failed') {
      focusField(outcome.focusTarget, session.getSnapshot().shippingAddress, locale);
    }
  }

  if (snapshot.isEmpty) {
    return (
      <main className="container grid gap-5 !px-3 py-7 sm:!px-6 lg:!px-8 lg:py-9">
        <div className="grid max-w-[68ch] gap-1.5">
          <Link
            href={getCartPath(locale)}
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.backToCart}
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight">{t.title}</h1>
        </div>
        <Card className="grid max-w-2xl justify-items-center gap-4 bg-[var(--surface-paper)] px-4 py-10 text-center shadow-[0_18px_54px_rgb(73_52_32/8%)] sm:px-5">
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
    <main className="container grid gap-5 !px-3 pb-28 pt-6 sm:!px-6 lg:!px-8 lg:gap-6 lg:pb-10 lg:pt-8">
      <header className="grid max-w-[72ch] gap-1.5">
        <Link
          href={getCartPath(locale)}
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.backToCart}
        </Link>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">{t.title}</h1>
        <CheckoutStepper current="details" locale={locale} />
        <p className="text-pretty text-sm leading-6 text-[var(--muted-foreground)]">{t.intro}</p>
      </header>

      <MobileOrderSummary
        model={orderSummaryModel}
        expanded={mobileSummaryExpanded}
        onExpandedChange={setMobileSummaryExpanded}
        discountPending={snapshot.destinationStatus.isPending}
        controlsDisabled={snapshot.controlsDisabled}
        onApplyDiscount={session.applyDiscount}
      />

      <div
        aria-busy={snapshot.submitStage !== 'idle'}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-7"
      >
        <section className="grid content-start gap-4">
          <Card className="overflow-hidden bg-[var(--surface-paper)] shadow-none">
            <CardContent className="space-y-0 p-0">
              <section
                aria-labelledby="checkout-contact-heading"
                className="grid gap-3 px-4 py-5 sm:px-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="checkout-contact-heading" className="text-base font-semibold">
                      {t.contact}
                    </h2>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">
                      {t.contactIntro}
                    </p>
                  </div>
                  {snapshot.contactReady ? (
                    <Check
                      aria-label={t.complete}
                      className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                    />
                  ) : null}
                </div>
                {!isSignedIn ? (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-[var(--muted-foreground)]">
                    <span>{t.signInPrompt}</span>
                    <Link
                      href={`${getLocalizedPath('/sign-in', locale)}?next=${encodeURIComponent(getCheckoutPath(locale))}`}
                      className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                    >
                      {t.signInAction}
                    </Link>
                  </p>
                ) : null}
                <ContactForm
                  key={snapshot.draftHydrated ? 'draft-hydrated' : 'draft-pending'}
                  locale={locale}
                  email={snapshot.email}
                  onEmailChange={session.setEmail}
                  onValidityChange={session.setContactReady}
                  showValidation={snapshot.submitAttempted}
                  disabled={snapshot.controlsDisabled}
                />
              </section>

              {snapshot.hasShippablePhysicalLines ? (
                <>
                  <Separator className="border-[var(--border)]/70" />
                  <section
                    aria-labelledby="checkout-destination-heading"
                    className="grid gap-4 px-4 py-5 sm:px-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 id="checkout-destination-heading" className="text-base font-semibold">
                          {t.destination}
                        </h2>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">
                          {t.destinationIntro}
                        </p>
                      </div>
                      {snapshot.shippingAddressReady ? (
                        <Check
                          aria-label={t.complete}
                          className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                        />
                      ) : null}
                    </div>

                    {!snapshot.destinationExpanded && snapshot.shippingAddress.countryCode ? (
                      <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {snapshot.shippingAddress.recipientName || savedAddress?.label}
                          </p>
                          <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
                            {[
                              snapshot.shippingAddress.addressLine1,
                              snapshot.shippingAddress.locality,
                              snapshot.shippingAddress.region,
                              snapshot.shippingAddress.countryCode
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {snapshot.destinationStatus.isPending ? (
                            <p className="mt-1 text-xs font-medium text-[var(--accent)]">
                              {t.calculating}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11 shrink-0 px-2 text-sm"
                          disabled={snapshot.controlsDisabled}
                          onClick={() => session.setDestinationExpanded(true)}
                        >
                          {t.changeAddress}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {savedAddresses.length > 0 ? (
                          <SavedAddressSelector
                            locale={locale}
                            addresses={savedAddresses}
                            pending={snapshot.controlsDisabled}
                            onApply={(address) => void session.applySavedAddress(address)}
                          />
                        ) : null}
                        <DestinationForm
                          locale={locale}
                          shippingAddress={snapshot.shippingAddress}
                          quoteStatus={snapshot.destinationStatus}
                          showValidation={snapshot.submitAttempted}
                          disabled={snapshot.controlsDisabled}
                          onShippingAddressChange={session.updateShippingAddress}
                          onDestinationChange={(destination) =>
                            void session.changeDestination(destination)
                          }
                        />
                      </div>
                    )}
                    {shippingNoticeText ? (
                      <p
                        role="status"
                        data-testid="checkout-shipping-notice"
                        className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--foreground)]"
                      >
                        <Truck
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                        />
                        <span className="min-w-0 break-words">{shippingNoticeText}</span>
                      </p>
                    ) : null}
                    {isSignedIn ? (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-1 py-2 text-sm font-semibold">
                        <Checkbox
                          checked={snapshot.saveAddress}
                          disabled={snapshot.controlsDisabled}
                          onCheckedChange={(checked) => session.setSaveAddress(checked === true)}
                          aria-label={t.saveAddress}
                          className="size-5"
                        />
                        <span className="min-w-0 break-words">{t.saveAddress}</span>
                      </label>
                    ) : null}
                  </section>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div ref={feedbackRef} tabIndex={-1} className="grid gap-4 outline-none empty:hidden">
            {quoteIssueText ? (
              <Alert variant="warning" className="grid gap-3">
                <p>{quoteIssueText}</p>
                {snapshot.destinationStatus.issue?.kind === 'unsupported' ? null : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-fit"
                    disabled={snapshot.destinationStatus.isPending}
                    onClick={() => void session.retryQuote()}
                  >
                    {t.retryQuote}
                  </Button>
                )}
              </Alert>
            ) : null}
            {snapshot.submitResult?.status === 'success' ? (
              <Alert variant="success">
                {t.success} {t.deadline}:{' '}
                {new Date(snapshot.submitResult.reservationExpiresAt).toLocaleString(locale)}.
              </Alert>
            ) : null}
            {snapshot.addressSaveWarning ? (
              <Alert variant="warning">{t.addressSaveWarning}</Alert>
            ) : null}
            {snapshot.submitError ? (
              <Alert variant={snapshot.submitError.variant} className="grid gap-3">
                <p>{t.errors[snapshot.submitError.messageKey]}</p>
                {snapshot.submitError.outcome === 'unknown' ? (
                  <Link
                    href={isSignedIn ? getAccountOrdersPath(locale) : getGuestOrderPath(locale)}
                    className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    {isSignedIn ? t.unknownRecovery.orders : t.unknownRecovery.guest}
                  </Link>
                ) : null}
                {snapshot.submitResult &&
                snapshot.submitResult.status !== 'success' &&
                snapshot.submitResult.errorId ? (
                  <IncidentReference incidentId={snapshot.submitResult.errorId} locale={locale} />
                ) : null}
                {(snapshot.submitResult &&
                  snapshot.submitResult.status !== 'success' &&
                  snapshot.submitResult.errorId) ||
                snapshot.submitError.outcome === 'unknown' ||
                !snapshot.submitError.retryAllowed ? (
                  <SupportLinks
                    locale={locale}
                    config={publicSupportConfig}
                    contactHref={getContactPath(locale)}
                  />
                ) : null}
              </Alert>
            ) : null}
          </div>
        </section>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <OrderSummary
            model={orderSummaryModel}
            actionLabel={actionLabel}
            actionDisabled={snapshot.actionDisabled}
            onSubmit={() => void handleSubmit()}
            discountPending={snapshot.destinationStatus.isPending}
            controlsDisabled={snapshot.controlsDisabled}
            onApplyDiscount={session.applyDiscount}
          />
        </aside>
      </div>

      <MobileCheckoutDock
        model={orderSummaryModel}
        label={actionLabel}
        disabled={snapshot.actionDisabled}
        onSubmit={() => void handleSubmit()}
      />

      {snapshot.proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={snapshot.proposal.quote}
          changes={snapshot.proposal.materialChanges}
          onConfirm={() => void handleAcceptProposal()}
          onCancel={session.rejectProposal}
        />
      ) : null}
    </main>
  );
}
