'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, MapPin, ShoppingBag } from 'lucide-react';
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
import {
  getAccountOrdersPath,
  getCartPath,
  getCatalogPath,
  getGuestOrderPath,
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
    success: 'Order is awaiting payment.',
    deadline: 'Reservation deadline',
    blockedItems: 'Resolve unavailable items before continuing.',
    updatingTotal: 'Wait while the current total is updated.',
    reviewUpdatedTotal: 'Review and accept the updated total before continuing.',
    retryQuote: 'Try again',
    saveAddress: 'Save this address to my account',
    addressSaveWarning: 'Your order was created, but this address could not be saved to your account.',
    quoteIssue: {
      unsupported:
        'We cannot ship these items to the selected destination. Change the address to continue.',
      network: 'We could not refresh your total. Check your connection and try again.',
      server: 'We could not recalculate your total. Try again.'
    },
    errors: {
      cookiesBlocked: 'Your browser is blocking cookies, so the order could not be held. Enable cookies or exit private/incognito mode and try again.',
      staleQuote: 'The price or stock just changed. Review the updated total and try again.',
      staleShipping: 'The shipping fee just changed. Confirm the delivery address again.',
      addressRequired: 'The delivery address is incomplete.',
      addressIncompleteUs: 'Orders shipping to the US need a state and ZIP code.',
      paymentMethodDrift: 'The payment method no longer matches this market. Reload the page.',
      conflict: 'Checkout could not reserve the current items. Review your cart and try again.',
      network: 'Could not reach the server. Your order was not created — please try again.',
      networkUnconfirmed:
        'We could not confirm whether your order went through. Check "My orders" before trying again so you do not order twice.',
      unknown: 'Something went wrong. Try again; if it keeps happening, send us the incident code below.',
      incidentCode: 'Incident code'
    }
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
    success: 'Đơn hàng đang chờ thanh toán.',
    deadline: 'Hạn giữ hàng',
    blockedItems: 'Hãy xử lý các sản phẩm chưa khả dụng trước khi tiếp tục.',
    updatingTotal: 'Chờ cập nhật xong tổng tiền hiện tại.',
    reviewUpdatedTotal: 'Xem và chấp nhận tổng tiền đã cập nhật trước khi tiếp tục.',
    retryQuote: 'Thử lại',
    saveAddress: 'Lưu địa chỉ này vào tài khoản',
    addressSaveWarning: 'Đơn hàng đã được tạo, nhưng chưa thể lưu địa chỉ này vào tài khoản.',
    quoteIssue: {
      unsupported:
        'Hiện chưa thể giao các sản phẩm này tới địa chỉ đã chọn. Hãy đổi địa chỉ để tiếp tục.',
      network: 'Không cập nhật được tổng tiền. Kiểm tra kết nối rồi thử lại.',
      server: 'Không tính lại được tổng tiền. Hãy thử lại.'
    },
    errors: {
      cookiesBlocked: 'Trình duyệt đang chặn cookie nên không giữ được đơn. Bật cookie hoặc thoát chế độ ẩn danh rồi thử lại.',
      staleQuote: 'Giá hoặc tình trạng hàng vừa thay đổi. Xem lại tổng tiền rồi thử lại.',
      staleShipping: 'Phí giao hàng vừa thay đổi. Xác nhận lại địa chỉ giao hàng.',
      addressRequired: 'Địa chỉ giao hàng chưa đầy đủ.',
      addressIncompleteUs: 'Đơn giao tới Mỹ cần bang và mã ZIP.',
      paymentMethodDrift: 'Phương thức thanh toán chưa khớp thị trường. Hãy tải lại trang.',
      conflict: 'Không giữ được sản phẩm trong giỏ. Xem lại giỏ hàng rồi thử lại.',
      network: 'Không kết nối được máy chủ. Đơn của bạn chưa được tạo — hãy thử lại.',
      networkUnconfirmed:
        'Chúng tôi chưa xác nhận được đơn của bạn đã tạo hay chưa. Hãy kiểm tra "Đơn hàng của tôi" trước khi thử lại để tránh đặt trùng.',
      unknown: 'Có lỗi xảy ra. Hãy thử lại; nếu vẫn lỗi, gửi cho chúng tôi mã sự cố bên dưới.',
      incidentCode: 'Mã sự cố'
    }
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
  initialEmail = '',
  savedAddresses = [],
  policyLinks = [],
  isSignedIn = false
}: {
  locale: Locale;
  initialEmail?: string;
  savedAddresses?: CustomerShippingAddress[];
  policyLinks?: CheckoutPolicyLink[];
  isSignedIn?: boolean;
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
    ...copy[locale],
    title: pageTranslate('title'), intro: pageTranslate('intro'), backToCart: pageTranslate('backToCart'),
    contact: pageTranslate('contact'), contactIntro: pageTranslate('contactIntro'), destination: pageTranslate('destination'),
    destinationIntro: pageTranslate('destinationIntro'), changeAddress: pageTranslate('changeAddress'), calculating: pageTranslate('calculating'),
    emptyTitle: pageTranslate('emptyTitle'), emptyBody: pageTranslate('emptyBody'), continueShopping: pageTranslate('continueShopping'),
    success: pageTranslate('success'), deadline: pageTranslate('deadline'), retryQuote: pageTranslate('retry'),
    saveAddress: pageTranslate('saveAddress'), addressSaveWarning: pageTranslate('addressSaveWarning'),
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
        setLifecycle(settled);
        return settled;
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
    const result = readEditableDraft({storage: checkoutSessionStorage()});
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
  }, [setLifecycle, setShippingAddressState]);

  useEffect(() => {
    if (!draftHydrated || !editableInteractedRef.current) return;
    writeEditableDraft({
      storage: checkoutSessionStorage(),
      draft: {email, shippingAddress}
    });
  }, [draftHydrated, email, shippingAddress]);

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
  const actionDisabled =
    controlsDisabled ||
    !acceptedQuote ||
    acceptedQuote.lines.length === 0 ||
    acceptedQuote.status !== 'ready' ||
    lifecycle.activeRequestId !== null ||
    Boolean(lifecycle.proposal) ||
    Boolean(lifecycle.issue) ||
    paymentIntent === null ||
    (physicalCount > 0 && acceptedQuote.shipping.status !== 'ready');
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
    blockingIssues: [...submitIssues, ...(actionBlocker ? [actionBlocker] : [])],
    showBlockingIssues: submitAttempted || actionDisabled,
    policyLinks,
    pending: lifecycle.activeRequestId !== null
  });
  const isEmpty =
    acceptedQuote?.status === 'empty' ||
    (!pending && Boolean(cart) && (cart?.lines.length ?? 0) === 0);

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
    setLifecycle(acceptQuoteProposal(lifecycleRef.current));
  }

  function reviewProposedDestination() {
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
      const refreshedQuote = refreshedLifecycle.acceptedQuote;
      const refreshedPaymentIntent = checkoutPaymentIntentForQuote(refreshedQuote);
      if (
        !refreshedQuote ||
        refreshedLifecycle.activeRequestId !== null ||
        refreshedLifecycle.proposal ||
        refreshedLifecycle.issue ||
        !refreshedPaymentIntent
      ) {
        return;
      }

      const submitInput = {
        locale,
        market: refreshedQuote.market,
        lines: quoteIntentLines(refreshedQuote),
        acceptedQuote: refreshedQuote,
        acceptedQuoteHash: refreshedQuote.hash,
        idempotencyKey: idempotencyKeyForQuote(refreshedQuote.hash),
        contactEmail: email.trim(),
        paymentIntent: refreshedPaymentIntent,
        destinationCountryCode:
          refreshedQuote.shipping.status === 'ready' ||
          refreshedQuote.shipping.status === 'unsupported_destination'
            ? refreshedQuote.shipping.countryCode
            : null,
        shippingAddress: physicalCount > 0 ? shippingAddress : null,
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
        if (isSignedIn && saveAddress && physicalCount > 0) {
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
                      aria-label="Complete"
                      className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                    />
                  ) : null}
                </div>
                <ContactForm
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
                          aria-label="Complete"
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
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {t.errors.incidentCode}: {submitResult.errorId}
                        </p>
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
