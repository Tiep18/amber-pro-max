'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, MapPin, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createTranslator} from 'next-intl';
import {
  customerAddressToShippingAddress,
  type CustomerShippingAddress
} from '@/account/addresses';
import {saveCheckoutShippingAddressAction} from '@/account/address-actions';
import {
  prepareGuestCheckoutRecoveryAction,
  refreshCheckoutQuoteAction,
  submitCheckoutAction,
  type SubmitCheckoutActionState
} from '@/checkout/actions';
import { checkoutPaymentIntentForQuote } from '@/checkout/payment-method';
import type { CheckoutPaymentIntent } from '@/checkout/schemas';
import {
  settleExpectedQuoteChange,
  type ShippingChangeNotice
} from '@/checkout/quote-review';
import { formatMoney } from '@/catalog/money';
import {
  clearEditableDraft,
  readEditableDraft,
  writeEditableDraft
} from '@/checkout/editable-draft';
import {
  clearStoredIdempotency,
  resolveIdempotencyKey,
  type ResolvedIdempotency
} from '@/checkout/idempotency';
import { presentSubmitError } from '@/checkout/submit-error-copy';
import { CheckoutStepper } from './checkout-stepper';
import {
  checkoutPrefillDestination,
  shouldReviewCheckoutQuoteChange,
  type CheckoutQuoteChangeSource
} from '@/checkout/prefill';
import { quoteIntentLines } from '@/checkout/quote-intent';
import { writeOrderSnapshot } from '@/cart/order-snapshot';
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
import type { ShippingAddress } from '@/checkout/shipping-address';
import {validateCheckoutShippingAddress} from '@/checkout/shipping-address-ui';
import type { CartQuote } from '@/checkout/types';
import { useCart } from '@/components/cart/cart-provider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {IncidentReference} from '@/components/support/incident-reference';
import {
  SupportLinks,
  type PublicSupportConfig
} from '@/components/support/support-links';
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
import type { DiscountApplyOutcome } from './discount-code-form';
import {
  buildOrderSummaryViewModel,
  MobileCheckoutDock,
  MobileOrderSummary,
  OrderSummary
} from './order-summary';
import { QuoteDiffDialog } from './quote-diff-dialog';
import { SavedAddressSelector } from './saved-address-selector';

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

type SubmitStage = 'idle' | 'checking-total' | 'creating-order';

function preferredAddress(addresses: CustomerShippingAddress[]) {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

function quoteDestination(quote: CartQuote): QuoteDestination | null {
  if (quote.shipping.status !== 'ready' && quote.shipping.status !== 'unsupported_destination') {
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

function activeDiscountCode(quote: CartQuote | null) {
  return quote?.discount.status === 'applied' ? quote.discount.code : null;
}

function checkoutSessionStorage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Blocked storage (private mode / cookie policy) must not break checkout.
    return null;
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
    title: pageTranslate('title'), intro: pageTranslate('intro'), backToCart: pageTranslate('backToCart'),
    contact: pageTranslate('contact'), contactIntro: pageTranslate('contactIntro'), complete: pageTranslate('complete'), destination: pageTranslate('destination'),
    destinationIntro: pageTranslate('destinationIntro'), changeAddress: pageTranslate('changeAddress'), calculating: pageTranslate('calculating'),
    emptyTitle: pageTranslate('emptyTitle'), emptyBody: pageTranslate('emptyBody'), continueShopping: pageTranslate('continueShopping'),
    success: pageTranslate('success'), deadline: pageTranslate('deadline'), retryQuote: pageTranslate('retry'),
    saveAddress: pageTranslate('saveAddress'), addressSaveWarning: pageTranslate('addressSaveWarning'),
    signInPrompt: pageTranslate('signInPrompt'), signInAction: pageTranslate('signInAction'),
    shippingCalculated: (amount: string) => pageTranslate('shippingCalculated', {amount}),
    shippingUpdated: (previous: string, current: string) =>
      pageTranslate('shippingUpdated', {previous, current}),
    handoff: submitTranslate('handoff'), paypalHandoff: submitTranslate('paypal'), vietqrHandoff: submitTranslate('vietqr'),
    checkingTotal: submitTranslate('checkingTotal'), submitting: submitTranslate('creatingOrder'),
    missingContact: submitTranslate('missingContact'), missingQuote: submitTranslate('missingTotal'),
    missingPayment: submitTranslate('missingPayment'), missingShipping: submitTranslate('missingShipping'),
    unsupportedShipping: submitTranslate('unsupportedShipping'), blockedItems: submitTranslate('blockedItems'),
    updatingTotal: submitTranslate('updatingTotal'), reviewUpdatedTotal: submitTranslate('reviewUpdatedTotal'),
    quoteIssue: {unsupported: submitTranslate('quoteUnsupported'), network: submitTranslate('quoteNetwork'), server: submitTranslate('quoteServer')},
    errors: {
      cookiesBlocked: submitTranslate('cookiesBlocked'), staleQuote: submitTranslate('staleQuote'), staleShipping: submitTranslate('staleShipping'),
      addressRequired: submitTranslate('addressRequired'), addressIncompleteUs: submitTranslate('addressIncompleteUs'),
      paymentMethodDrift: submitTranslate('paymentMethodDrift'), conflict: submitTranslate('conflict'), network: submitTranslate('network'),
      networkUnconfirmed: submitTranslate('unknownOutcome'), unknown: submitTranslate('unknown'), incidentCode: submitTranslate('incidentId')
    },
    unknownRecovery: {
      orders: ordersTranslate('actions.myOrders'),
      guest: ordersTranslate('accessDenied.recoverGuest')
    }
  };
  const { quote, cart, pending, completeOrder } = useCart();
  const savedAddress = useMemo(() => preferredAddress(savedAddresses), [savedAddresses]);
  const savedShippingAddress = useMemo(
    () => (savedAddress ? customerAddressToShippingAddress(savedAddress) : null),
    [savedAddress]
  );
  const [lifecycle, setLifecycleState] = useState(() => createCheckoutQuoteLifecycleState(quote));
  const lifecycleRef = useRef(lifecycle);
  const destinationAuthorityRef = useRef(false);
  const editableInteractedRef = useRef(false);
  const prefillRequestRef = useRef<string | null>(null);
  const idempotencyRef = useRef<ResolvedIdempotency | null>(null);
  const submitInFlightRef = useRef(false);
  // Set when a pay attempt was interrupted by a review dialog, so accepting
  // the reviewed quote finishes the attempt instead of asking for the same
  // button press a second time.
  const resumeSubmitAfterReviewRef = useRef(false);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const acceptedQuote = lifecycle.acceptedQuote;
  const [email, setEmail] = useState(initialEmail);
  const [contactReady, setContactReady] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(
    savedShippingAddress ?? emptyShippingAddress
  );
  const shippingAddressRef = useRef(shippingAddress);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [destinationExpanded, setDestinationExpanded] = useState(!savedShippingAddress);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressSaveWarning, setAddressSaveWarning] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitCheckoutActionState | null>(null);
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [mobileSummaryExpanded, setMobileSummaryExpanded] = useState(false);
  const [dedupeGuaranteed, setDedupeGuaranteed] = useState(true);
  const [shippingNotice, setShippingNotice] = useState<{
    notice: ShippingChangeNotice;
    currencyCode: NonNullable<CartQuote['currencyCode']>;
  } | null>(null);
  const paymentIntent = checkoutPaymentIntentForQuote(acceptedQuote);
  const submitting = submitStage !== 'idle';

  const setLifecycle = useCallback((next: CheckoutQuoteLifecycleState) => {
    lifecycleRef.current = next;
    setLifecycleState(next);
  }, []);

  const setShippingAddressState = useCallback((next: ShippingAddress) => {
    shippingAddressRef.current = next;
    setShippingAddress(next);
  }, []);

  const beginCheckoutInteraction = useCallback(() => {
    setSubmitResult(null);
    setShippingNotice(null);
  }, []);

  const beginEditableInteraction = useCallback(() => {
    editableInteractedRef.current = true;
    beginCheckoutInteraction();
  }, [beginCheckoutInteraction]);

  const requestQuote = useCallback(
    async (
      destination: QuoteDestination,
      nextAddress?: ShippingAddress,
      upstreamQuote?: CartQuote,
      source: CheckoutQuoteChangeSource = 'destination',
      discountCodeOverride?: { code: string | null }
    ) => {
      beginCheckoutInteraction();
      if (source !== 'submit') {
        resumeSubmitAfterReviewRef.current = false;
      }
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
          lines: baseQuote ? quoteIntentLines(baseQuote) : (cart?.lines ?? []),
          destinationCountryCode: destination.countryCode,
          destinationRegionCode: destination.regionCode,
          shippingQuoteVersion: 2,
          discountCode: discountCodeOverride ? discountCodeOverride.code : activeDiscountCode(baseQuote),
          priorAcceptedQuoteHash: current.acceptedQuote?.hash ?? null
        });
        const latest = lifecycleRef.current;
        const previousAcceptedQuote = latest.acceptedQuote;
        const settlementState =
          !shouldReviewCheckoutQuoteChange(source) &&
          result.status === 'success' &&
          latest.acceptedQuote
            ? { ...latest, acceptedQuote: null }
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
        // A destination edit that only moved the shipping fee has already been
        // decided by the customer. Absorb it here and say what changed inline
        // rather than raising a modal over the answer they just gave. A late
        // response from a superseded request owns none of this: a newer request
        // is already driving the screen.
        const ownsRequest = settlementState.activeRequestId === transition.request.requestId;
        const resolved = ownsRequest
          ? settleExpectedQuoteChange({ state: settled, previousAcceptedQuote, source })
          : { state: settled, notice: null };
        if (ownsRequest) {
          const noticeCurrency = resolved.state.acceptedQuote?.currencyCode ?? null;
          setShippingNotice(
            resolved.notice && noticeCurrency
              ? { notice: resolved.notice, currencyCode: noticeCurrency }
              : null
          );
        }
        setLifecycle(resolved.state);
        return resolved.state;
      } catch {
        const settled = settleQuoteRequest(lifecycleRef.current, transition.request.requestId, {
          status: 'network_error'
        });
        setLifecycle(settled);
        return settled;
      }
    },
    [beginCheckoutInteraction, cart?.lines, locale, setLifecycle, setShippingAddressState]
  );

  useEffect(() => {
    const result = readEditableDraft({storage: checkoutSessionStorage(), scope: draftScope});
    if (result.status === 'found') {
      const restoredAddress = result.draft.shippingAddress;
      setEmail(result.draft.email);
      setShippingAddressState(restoredAddress);
      setDestinationExpanded(true);
      destinationAuthorityRef.current = Boolean(restoredAddress.countryCode);
      setLifecycle(
        createCheckoutQuoteLifecycleState(lifecycleRef.current.acceptedQuote, {
          countryCode: restoredAddress.countryCode || null,
          regionCode: restoredAddress.countryCode === 'US' ? restoredAddress.region : null
        })
      );
    }
    setDraftHydrated(true);
  }, [draftScope, setLifecycle, setShippingAddressState]);

  useEffect(() => {
    if (!draftHydrated || !editableInteractedRef.current) return;
    writeEditableDraft({
      storage: checkoutSessionStorage(),
      scope: draftScope,
      draft: {email, shippingAddress}
    });
  }, [draftHydrated, draftScope, email, shippingAddress]);

  useEffect(() => {
    if (!draftHydrated) return;
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
  }, [draftHydrated, quote, requestQuote, savedShippingAddress, setLifecycle, setShippingAddressState]);

  // The submit button sits in a sticky bottom dock on mobile, so feedback that
  // renders in the left column can land entirely off-screen: the customer taps
  // and nothing appears to happen. Bring it into view — unless the error points
  // at a specific field, in which case focusing that field scrolls to it and
  // stealing focus here would undo the more useful move.
  useEffect(() => {
    const failed = submitResult && submitResult.status !== 'success';
    if (!failed && !lifecycle.issue) return;
    if (failed && presentSubmitError(submitResult).focusTarget) return;
    const node = feedbackRef.current;
    if (!node) return;
    node.scrollIntoView({behavior: 'smooth', block: 'center'});
    node.focus({preventScroll: true});
  }, [lifecycle.issue, submitResult]);

  const physicalCount =
    acceptedQuote?.lines.filter((line) => line.fulfillmentType === 'physical' && line.quantity > 0)
      .length ?? 0;
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
        physicalCount > 0 && acceptedQuote?.shipping.status === 'unsupported_destination'
          ? t.unsupportedShipping
          : null
      ].filter(Boolean) as string[]
    )
  );
  // `lifecycle.issue` used to be rendered only inside DestinationForm, which is
  // not mounted for a digital-only cart or while a saved address is collapsed.
  // A failed requote then disabled the submit button with nothing on screen to
  // explain it, and only a reload recovered.
  const quoteIssueText = lifecycle.issue
    ? lifecycle.issue.kind === 'unsupported'
      ? t.quoteIssue.unsupported
      : lifecycle.issue.kind === 'network'
        ? t.quoteIssue.network
        : t.quoteIssue.server
    : null;
  const blockingNotice =
    acceptedQuote?.status === 'blocked' ? t.blockedItems : (quoteIssueText ?? null);
  const controlsDisabled = submitting || lifecycle.activeRequestId !== null || pending;
  // Refuse the press only when pressing genuinely cannot help: checkout is
  // busy, a decision is already on screen with its own controls (the review
  // dialog, the failed-requote alert and its retry button), or the cart itself
  // is what needs fixing and the summary already links to it.
  //
  // A destination the customer simply has not entered yet is *not* one of those
  // — it used to grey the button out on arrival for every physical cart, with
  // the explanation buried in small print. Pressing now moves focus to the
  // first field still missing, which says far more than a dead control.
  const actionDisabled =
    controlsDisabled ||
    Boolean(lifecycle.proposal) ||
    Boolean(lifecycle.issue) ||
    !acceptedQuote ||
    acceptedQuote.lines.length === 0 ||
    acceptedQuote.status !== 'ready' ||
    paymentIntent === null;
  const actionLabel = submitStage === 'checking-total'
    ? t.checkingTotal
    : submitStage === 'creating-order'
      ? t.submitting
    : paymentIntent === 'paypal_intent'
      ? t.paypalHandoff
      : paymentIntent === 'vietqr_intent'
        ? t.vietqrHandoff
        : t.handoff;
  const actionBlocker = lifecycle.activeRequestId !== null
    ? t.updatingTotal
    : lifecycle.proposal
      ? t.reviewUpdatedTotal
      : blockingNotice;
  const orderSummaryModel = buildOrderSummaryViewModel({
    quote: acceptedQuote,
    locale,
    paymentIntent,
    shippingAddress,
    contactEmail: contactReady ? email : null,
    blockingIssues: [...submitIssues, ...(actionBlocker ? [actionBlocker] : [])],
    // Unchanged, but it now stays quiet on arrival: a missing address no longer
    // disables the button, so it no longer needs small print to explain one.
    showBlockingIssues: submitAttempted || actionDisabled,
    policyLinks,
    pending: lifecycle.activeRequestId !== null
  });
  const isEmpty =
    acceptedQuote?.status === 'empty' ||
    (!pending && Boolean(cart) && (cart?.lines.length ?? 0) === 0);
  const shippingNoticeText = shippingNotice
    ? shippingNotice.notice.kind === 'calculated'
      ? t.shippingCalculated(
          formatMoney({
            amountMinor: shippingNotice.notice.currentAmountMinor,
            currencyCode: shippingNotice.currencyCode
          })
        )
      : t.shippingUpdated(
          formatMoney({
            amountMinor: shippingNotice.notice.previousAmountMinor,
            currencyCode: shippingNotice.currencyCode
          }),
          formatMoney({
            amountMinor: shippingNotice.notice.currentAmountMinor,
            currencyCode: shippingNotice.currencyCode
          })
        )
    : null;

  async function applyDiscountCode(code: string | null): Promise<DiscountApplyOutcome> {
    if (!acceptedQuote) {
      return { status: 'failed', quoteHash: null };
    }
    const settled = await requestQuote(
      lifecycleRef.current.destination,
      undefined,
      acceptedQuote,
      'discount',
      { code }
    );
    if (settled.issue) {
      return { status: 'failed', quoteHash: null };
    }
    const settledQuote = settled.proposal?.quote ?? settled.acceptedQuote;
    if (!settledQuote) {
      return { status: 'failed', quoteHash: null };
    }
    return {
      status: settledQuote.discount.status === 'not_eligible' ? 'not_eligible' : 'applied',
      quoteHash: settledQuote.hash
    };
  }

  function retryQuote() {
    void requestQuote(
      lifecycleRef.current.destination,
      undefined,
      lifecycleRef.current.acceptedQuote ?? undefined,
      'destination'
    );
  }

  function acceptProposedQuote() {
    beginCheckoutInteraction();
    const accepted = acceptQuoteProposal(lifecycleRef.current);
    setLifecycle(accepted);
    if (!resumeSubmitAfterReviewRef.current) {
      return;
    }
    resumeSubmitAfterReviewRef.current = false;
    // The customer pressed pay, was shown exactly what moved, and accepted it.
    // Asking for the same press again is asking for the same decision twice.
    void continueSubmitWithReviewedQuote(accepted);
  }

  function reviewProposedDestination() {
    resumeSubmitAfterReviewRef.current = false;
    const current = lifecycleRef.current;
    const acceptedDestination = current.acceptedQuote
      ? quoteDestination(current.acceptedQuote)
      : null;
    const restoredDestination = acceptedDestination ?? {
      countryCode: null,
      regionCode: null
    };

    beginCheckoutInteraction();
    setDestinationExpanded(true);
    setShippingAddressState({
      ...shippingAddressRef.current,
      countryCode: restoredDestination.countryCode ?? '',
      region: restoredDestination.regionCode
    });
    setLifecycle(reviewDestination(current, restoredDestination));
  }

  function idempotencyKeyForQuote(quoteHash: string) {
    const resolved = resolveIdempotencyKey({
      storage: checkoutSessionStorage(),
      quoteHash,
      inMemory: idempotencyRef.current,
      mintKey: () => `checkout-${quoteHash.slice(0, 24)}-${globalThis.crypto.randomUUID()}`
    });
    idempotencyRef.current = resolved;
    // Guest checkout always dedupes (the server derives the key from the
    // httpOnly recovery cookie). Signed-in checkout only dedupes when this key
    // survived to storage, which decides whether a lost response can honestly
    // be reported as "your order was not created".
    setDedupeGuaranteed(!isSignedIn || resolved.persisted);
    return resolved.key;
  }

  function focusDestinationSection() {
    setDestinationExpanded(true);
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
            : ([['addressLine1', 'shipping-address-line-1']] as Array<[
                keyof ShippingAddress,
                string
              ]>))
      ];
      const targetId = orderedFields.find(([field]) => errors[field])?.[1] ?? 'shipping-country-trigger';
      const target = document.getElementById(targetId);
      target?.scrollIntoView({behavior: 'smooth', block: 'center'});
      target?.focus({preventScroll: true});
    });
  }

  function focusFirstIncompleteField(target?: 'contact' | 'destination' | 'cart') {
    if (target === 'contact') {
      document.getElementById('checkout-email')?.focus();
      return;
    }
    if (target === 'destination') {
      focusDestinationSection();
      return;
    }
    if (target === 'cart') {
      return;
    }
    if (!contactReady) {
      document.getElementById('checkout-email')?.focus();
      return;
    }
    if (physicalCount > 0 && !shippingAddressReady) {
      focusDestinationSection();
      return;
    }
    if (physicalCount > 0 && acceptedQuote?.shipping.status === 'unsupported_destination') {
      focusDestinationSection();
    }
  }

  async function submit() {
    if (submitInFlightRef.current) return;
    setSubmitAttempted(true);
    if (!readyToSubmit) {
      focusFirstIncompleteField();
      return;
    }
    if (!acceptedQuote || !cart || !paymentIntent) return;

    submitInFlightRef.current = true;
    setSubmitStage('checking-total');
    setSubmitResult(null);
    try {
      const refreshedLifecycle = await requestQuote(
        lifecycleRef.current.destination,
        undefined,
        acceptedQuote,
        'submit'
      );
      if (refreshedLifecycle.proposal) {
        // Hold on to the intent to pay so accepting the reviewed quote finishes
        // this attempt rather than starting a new one.
        resumeSubmitAfterReviewRef.current = true;
        return;
      }
      const refreshedQuote = refreshedLifecycle.acceptedQuote;
      const refreshedPaymentIntent = checkoutPaymentIntentForQuote(refreshedQuote);
      if (
        !refreshedQuote ||
        refreshedLifecycle.activeRequestId !== null ||
        refreshedLifecycle.issue ||
        !refreshedPaymentIntent
      ) {
        return;
      }

      await placeOrderForQuote(
        refreshedQuote,
        refreshedPaymentIntent,
        physicalLineCount(refreshedQuote)
      );
    } catch {
      setSubmitResult({ status: 'error', code: 'checkout_submit_failed' });
    } finally {
      submitInFlightRef.current = false;
      setSubmitStage('idle');
    }
  }


  function physicalLineCount(quote: CartQuote) {
    return quote.lines.filter(
      (line) => line.fulfillmentType === 'physical' && line.quantity > 0
    ).length;
  }

  /**
   * Places the order for one quote that has already passed the freshness and
   * material-change gates. The caller owns `submitInFlightRef` and the submit
   * stage reset, so the button never falls back to its idle label between
   * checking the total and placing the order.
   */
  async function placeOrderForQuote(
    refreshedQuote: CartQuote,
    quotePaymentIntent: CheckoutPaymentIntent,
    physicalLines: number
  ) {
    if (!cart) return;

    const submitInput = {
      locale,
      market: refreshedQuote.market,
      lines: quoteIntentLines(refreshedQuote),
      acceptedQuote: refreshedQuote,
      acceptedQuoteHash: refreshedQuote.hash,
      idempotencyKey: idempotencyKeyForQuote(refreshedQuote.hash),
      contactEmail: email.trim(),
      paymentIntent: quotePaymentIntent,
      destinationCountryCode:
        refreshedQuote.shipping.status === 'ready' ||
        refreshedQuote.shipping.status === 'unsupported_destination'
          ? refreshedQuote.shipping.countryCode
          : null,
      shippingAddress: physicalLines > 0 ? shippingAddress : null,
      discountCode: activeDiscountCode(refreshedQuote)
    };
    setSubmitStage('creating-order');
    const prepared = await prepareGuestCheckoutRecoveryAction({
      acceptedQuote: refreshedQuote,
      acceptedQuoteHash: submitInput.acceptedQuoteHash,
      contactEmail: submitInput.contactEmail,
      paymentIntent: submitInput.paymentIntent
    });
    const result =
      prepared.status === 'ready'
        ? await submitCheckoutAction(submitInput)
        : ({ status: 'invalid', code: prepared.code } as const);
    setSubmitResult(result);
    if (result.status === 'success') {
      const completedLines = refreshedQuote.lines
        .filter(
          (line) =>
            (line.status === 'ready' || line.status === 'quantity_capped') && line.quantity > 0
        )
        .map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity
        }));
      const snapshotLines = completedLines.flatMap((completed) => {
        const intentLine = cart?.lines.find(
          (candidate) =>
            candidate.productId === completed.productId &&
            (candidate.variantId ?? null) === completed.variantId
        );
        return intentLine ? [{ ...intentLine, quantity: completed.quantity }] : [];
      });
      if (snapshotLines.length > 0) {
        writeOrderSnapshot({ orderNumber: result.orderNumber, lines: snapshotLines });
      }
      // The key has done its job. Leaving it behind would make a future
      // cart that happens to hash identically dedupe back onto this order.
      clearEditableDraft(checkoutSessionStorage());
      clearStoredIdempotency(checkoutSessionStorage());
      idempotencyRef.current = null;
      if (isSignedIn && saveAddress && physicalLines > 0) {
        try {
          const saveResult = await saveCheckoutShippingAddressAction({
            locale,
            address: {
              label: shippingAddress.recipientName.trim().slice(0, 80),
              ...shippingAddress,
              isDefault: false
            }
          });
          setAddressSaveWarning(saveResult.status !== 'saved');
        } catch {
          setAddressSaveWarning(true);
        }
      }
      completeOrder(completedLines);
      router.push(result.orderPath);
    } else {
      const focusTarget = presentSubmitError(result).focusTarget;
      if (focusTarget) {
        focusFirstIncompleteField(focusTarget);
      }
    }
  }

  /**
   * Resumes a pay attempt that the review dialog interrupted. The quote here is
   * the one the customer explicitly accepted seconds ago, so it is submitted
   * directly; the server still re-verifies the hash and rejects a stale one.
   */
  async function continueSubmitWithReviewedQuote(reviewed: CheckoutQuoteLifecycleState) {
    const quote = reviewed.acceptedQuote;
    if (!quote || submitInFlightRef.current) return;

    const physicalLines = physicalLineCount(quote);
    const reviewedPaymentIntent = checkoutPaymentIntentForQuote(quote);
    if (
      !contactReady ||
      !reviewedPaymentIntent ||
      (physicalLines > 0 && quote.shipping.status !== 'ready') ||
      !canSubmitAcceptedQuote(reviewed, physicalLines > 0 ? shippingAddress : null)
    ) {
      focusFirstIncompleteField();
      return;
    }

    submitInFlightRef.current = true;
    setSubmitResult(null);
    try {
      await placeOrderForQuote(quote, reviewedPaymentIntent, physicalLines);
    } catch {
      setSubmitResult({ status: 'error', code: 'checkout_submit_failed' });
    } finally {
      submitInFlightRef.current = false;
      setSubmitStage('idle');
    }
  }

  if (isEmpty) {
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
        discountPending={lifecycle.activeRequestId !== null}
        controlsDisabled={controlsDisabled}
        onApplyDiscount={applyDiscountCode}
      />

      <div
        aria-busy={submitStage !== 'idle'}
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
                  {contactReady ? (
                    <Check
                      aria-label={t.complete}
                      className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                    />
                  ) : null}
                </div>
                {/* Returning customers already have their address on file, but
                    guest checkout gave them no way to reach it — they retyped
                    it every time. `next` brings them straight back here; the
                    cart and the tab draft both survive the round trip. */}
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
                  key={draftHydrated ? 'draft-hydrated' : 'draft-pending'}
                  locale={locale}
                  email={email}
                  onEmailChange={(nextEmail) => {
                    beginEditableInteraction();
                    setEmail(nextEmail);
                  }}
                  onValidityChange={setContactReady}
                  showValidation={submitAttempted}
                  disabled={controlsDisabled}
                />
              </section>

              {physicalCount > 0 ? (
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
                      {shippingAddressReady ? (
                        <Check
                          aria-label={t.complete}
                          className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                        />
                      ) : null}
                    </div>

                    {!destinationExpanded && shippingAddress.countryCode ? (
                      <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {shippingAddress.recipientName || savedAddress?.label}
                          </p>
                          <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
                            {[
                              shippingAddress.addressLine1,
                              shippingAddress.locality,
                              shippingAddress.region,
                              shippingAddress.countryCode
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {lifecycle.activeRequestId !== null ? (
                            <p className="mt-1 text-xs font-medium text-[var(--accent)]">
                              {t.calculating}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11 shrink-0 px-2 text-sm"
                          disabled={controlsDisabled}
                          onClick={() => setDestinationExpanded(true)}
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
                            pending={controlsDisabled}
                            onApply={(address) => {
                              beginEditableInteraction();
                              setDestinationExpanded(false);
                              void requestQuote(
                                { countryCode: address.countryCode, regionCode: address.region },
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
                          disabled={controlsDisabled}
                          onShippingAddressChange={(nextAddress) => {
                            beginEditableInteraction();
                            setShippingAddressState(nextAddress);
                          }}
                          onDestinationChange={(destination) => void requestQuote(destination)}
                        />
                      </div>
                    )}
                    {/* What the review dialog used to interrupt to say. Stated
                        once, where the customer just acted, without taking the
                        page away from them. */}
                    {shippingNoticeText ? (
                      <p
                        role="status"
                        data-testid="checkout-shipping-notice"
                        className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--foreground)]"
                      >
                        <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                        <span className="min-w-0 break-words">{shippingNoticeText}</span>
                      </p>
                    ) : null}
                    {isSignedIn ? (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-1 py-2 text-sm font-semibold">
                        <Checkbox
                          checked={saveAddress}
                          disabled={controlsDisabled}
                          onCheckedChange={(checked) => setSaveAddress(checked === true)}
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
                {lifecycle.issue?.kind === 'unsupported' ? null : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-fit"
                    disabled={lifecycle.activeRequestId !== null}
                    onClick={retryQuote}
                  >
                    {t.retryQuote}
                  </Button>
                )}
              </Alert>
            ) : null}
            {submitResult?.status === 'success' ? (
              <Alert variant="success">
                {t.success} {t.deadline}:{' '}
                {new Date(submitResult.reservationExpiresAt).toLocaleString(locale)}.
              </Alert>
            ) : null}
            {addressSaveWarning ? <Alert variant="warning">{t.addressSaveWarning}</Alert> : null}
            {submitResult && submitResult.status !== 'success'
              ? (() => {
                  const presentation = presentSubmitError(submitResult, {dedupeGuaranteed});
                      return (
                        <Alert variant={presentation.variant} className="grid gap-3">
                          <p>{t.errors[presentation.messageKey]}</p>
                          {presentation.outcome === 'unknown' ? (
                            <Link
                              href={
                                isSignedIn
                                  ? getAccountOrdersPath(locale)
                                  : getGuestOrderPath(locale)
                              }
                              className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                            >
                              {isSignedIn
                                ? t.unknownRecovery.orders
                                : t.unknownRecovery.guest}
                            </Link>
                          ) : null}
                          {submitResult.errorId ? (
                            <IncidentReference
                              incidentId={submitResult.errorId}
                              locale={locale}
                            />
                          ) : null}
                          {submitResult.errorId ||
                          presentation.outcome === 'unknown' ||
                          !presentation.retryAllowed ? (
                            <SupportLinks
                              locale={locale}
                              config={publicSupportConfig}
                              contactHref={getContactPath(locale)}
                            />
                          ) : null}
                        </Alert>
                  );
                })()
              : null}
          </div>
        </section>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <OrderSummary
            model={orderSummaryModel}
            actionLabel={actionLabel}
            actionDisabled={actionDisabled}
            onSubmit={() => void submit()}
            discountPending={lifecycle.activeRequestId !== null}
            controlsDisabled={controlsDisabled}
            onApplyDiscount={applyDiscountCode}
          />
        </aside>
      </div>

      <MobileCheckoutDock
        model={orderSummaryModel}
        label={actionLabel}
        disabled={actionDisabled}
        onSubmit={() => void submit()}
      />

      {lifecycle.proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={lifecycle.proposal.quote}
          changes={lifecycle.proposal.materialChanges}
          onConfirm={acceptProposedQuote}
          onCancel={reviewProposedDestination}
        />
      ) : null}
    </main>
  );
}
