import { suggestMarketFromCountry, type MarketCode } from '@/catalog/market';
import type { CartIntentLine } from '@/cart/types';
import type { Locale } from '@/i18n/routing';
import type { CheckoutQuoteActionState, SubmitCheckoutActionState } from './actions';
import {
  clearEditableDraft,
  readEditableDraft,
  writeEditableDraft,
  type EditableDraftStorage
} from './editable-draft';
import {
  clearStoredIdempotency,
  resolveIdempotencyKey,
  type ResolvedIdempotency
} from './idempotency';
import { checkoutPaymentIntentForQuote } from './payment-method';
import type { CheckoutPaymentIntent } from './schemas';
import {
  quoteHasPhysicalLines,
  quoteShippingCountryCode,
  resolverRegionCode,
  validateShippingDestination,
  type ShippingAddress
} from './shipping-address';
import { presentSubmitError, type SubmitErrorPresentation } from './submit-error-copy';
import type { CartQuote, CartQuoteLine, QuoteCartActionInput } from './types';

export type QuoteDestination = {
  countryCode: string | null;
  regionCode: string | null;
};

export type CheckoutQuoteIssue = {
  kind: 'unsupported' | 'network' | 'server';
  code: string | null;
};

export type DestinationQuoteStatus = Readonly<{
  destination: QuoteDestination;
  loadingMode: 'initial' | 'updating' | null;
  isPending: boolean;
  issue: CheckoutQuoteIssue | null;
}>;

export type MaterialQuoteChange =
  | {
      type: 'market_changed';
      previousMarket: MarketCode;
      currentMarket: MarketCode;
    }
  | {
      type: 'currency_changed';
      previousCurrency: string | null;
      currentCurrency: string | null;
    }
  | {
      type: 'shipping_changed';
      previousAmountMinor: number | null;
      currentAmountMinor: number | null;
    }
  | {
      type: 'line_changed';
      lineId: string;
      title: string;
      previousStatus: CartQuoteLine['status'] | 'missing';
      currentStatus: CartQuoteLine['status'] | 'missing';
      previousSubtotalMinor: number;
      currentSubtotalMinor: number;
    }
  | {
      type: 'total_changed';
      previousTotalMinor: number;
      currentTotalMinor: number;
    };

export type ShippingChangeNotice =
  | { kind: 'calculated'; previousAmountMinor: null; currentAmountMinor: number }
  | { kind: 'updated'; previousAmountMinor: number; currentAmountMinor: number };

export type SubmitStage = 'idle' | 'checking-total' | 'creating-order';
export type CheckoutFocusTarget = 'contact' | 'destination' | 'cart';

export type ReadinessIssueCode =
  | 'missing_quote'
  | 'missing_contact'
  | 'missing_payment'
  | 'missing_shipping'
  | 'unsupported_shipping';

export type ActionBlockerCode =
  | 'updating_total'
  | 'review_updated_total'
  | 'blocked_items'
  | 'quote_unsupported'
  | 'quote_network'
  | 'quote_server';

export type CompletedOrderLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type OrderCreatedEvent = {
  orderId: string;
  orderNumber: string;
  reservationExpiresAt: string;
  orderPath: string;
  completedLines: readonly CompletedOrderLine[];
};

export type DiscountApplyOutcome = {
  status: 'applied' | 'not_eligible' | 'failed';
  quoteHash: string | null;
};

export type UpstreamCartState = {
  quote: CartQuote | null;
  lines: readonly CartIntentLine[] | null;
  hasCart: boolean;
  pending: boolean;
};

export type CheckoutSubmitPayload = {
  locale: Locale;
  market: MarketCode;
  lines: CartIntentLine[];
  acceptedQuote: CartQuote;
  acceptedQuoteHash: string;
  idempotencyKey: string;
  contactEmail: string;
  paymentIntent: CheckoutPaymentIntent;
  destinationCountryCode: string | null;
  shippingAddress: ShippingAddress | null;
  discountCode: string | null;
};

export type CheckoutSessionConfig = {
  locale: Locale;
  draftScope: string;
  isSignedIn: boolean;
  initialEmail?: string;
  savedShippingAddress?: ShippingAddress | null;
  initialCart?: UpstreamCartState;
};

export type CheckoutSessionPorts = {
  refreshQuote: (input: QuoteCartActionInput) => Promise<CheckoutQuoteActionState>;
  prepareGuestRecovery: (input: {
    acceptedQuote: CartQuote;
    acceptedQuoteHash: string;
    contactEmail: string;
    paymentIntent: CheckoutPaymentIntent;
  }) => Promise<{ status: 'ready' } | { status: 'invalid'; code: string }>;
  submitOrder: (input: CheckoutSubmitPayload) => Promise<SubmitCheckoutActionState>;
  saveShippingAddress: (input: {
    locale: Locale;
    address: ShippingAddress & { label: string; isDefault: false };
  }) => Promise<{ status: string }>;
  getStorage: () => EditableDraftStorage | null;
  onOrderCreated: (event: OrderCreatedEvent) => void;
  mintIdempotencyKey?: (quoteHash: string) => string;
};

export type SubmitOutcome =
  | {
      status: 'submitted';
      orderId: string;
      orderNumber: string;
      reservationExpiresAt: string;
      orderPath: string;
      completedLines: readonly CompletedOrderLine[];
    }
  | { status: 'needs_review' }
  | { status: 'invalid'; focusTarget: CheckoutFocusTarget | null }
  | {
      status: 'failed';
      result: Exclude<SubmitCheckoutActionState, { status: 'success' }>;
      focusTarget: CheckoutFocusTarget | null;
    }
  | { status: 'aborted' | 'ignored' };

export type CheckoutSessionSnapshot = Readonly<{
  acceptedQuote: CartQuote | null;
  paymentIntent: CheckoutPaymentIntent | null;
  destinationStatus: DestinationQuoteStatus;
  proposal: Readonly<{ quote: CartQuote; materialChanges: readonly MaterialQuoteChange[] }> | null;
  shippingNotice: Readonly<{
    notice: ShippingChangeNotice;
    currencyCode: NonNullable<CartQuote['currencyCode']>;
  }> | null;
  email: string;
  contactReady: boolean;
  shippingAddress: ShippingAddress;
  destinationExpanded: boolean;
  saveAddress: boolean;
  draftHydrated: boolean;
  submitAttempted: boolean;
  isEmpty: boolean;
  hasShippablePhysicalLines: boolean;
  shippingAddressReady: boolean;
  readyToSubmit: boolean;
  controlsDisabled: boolean;
  actionDisabled: boolean;
  actionBlocker: ActionBlockerCode | null;
  readinessIssues: readonly ReadinessIssueCode[];
  submitStage: SubmitStage;
  submitResult: SubmitCheckoutActionState | null;
  submitError: SubmitErrorPresentation | null;
  dedupeGuaranteed: boolean;
  addressSaveWarning: boolean;
}>;

export type CheckoutSession = {
  getSnapshot: () => CheckoutSessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrateDraft: () => void;
  syncCart: (
    upstream: UpstreamCartState,
    options?: { savedShippingAddress?: ShippingAddress | null; isSignedIn?: boolean }
  ) => void;
  setEmail: (email: string) => void;
  setContactReady: (ready: boolean) => void;
  updateShippingAddress: (address: ShippingAddress) => void;
  changeDestination: (destination: QuoteDestination) => Promise<void>;
  applySavedAddress: (address: ShippingAddress) => Promise<void>;
  setDestinationExpanded: (expanded: boolean) => void;
  setSaveAddress: (save: boolean) => void;
  applyDiscount: (code: string | null) => Promise<DiscountApplyOutcome>;
  retryQuote: () => Promise<void>;
  acceptProposalAndResume: () => Promise<SubmitOutcome | { status: 'accepted' }>;
  rejectProposal: () => void;
  submit: () => Promise<SubmitOutcome>;
  dispose: () => void;
};

type QuoteChangeSource = 'prefill' | 'destination' | 'upstream' | 'submit' | 'discount';

type CartLineChange = {
  type: 'price_changed' | 'availability_changed';
  lineId: string;
};

type QuoteSettlement =
  | { status: 'ready'; quote: CartQuote }
  | { status: 'unsupported'; code?: string | null }
  | { status: 'network_error'; code?: string | null }
  | { status: 'server_error'; code?: string | null };

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

const DESTINATION_EXPECTED_CHANGES = new Set<MaterialQuoteChange['type']>([
  'shipping_changed',
  'total_changed'
]);

function normalizeCode(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function normalizeDestination(destination: Partial<QuoteDestination>): QuoteDestination {
  const countryCode = normalizeCode(destination.countryCode, 2);
  return {
    countryCode,
    regionCode: resolverRegionCode(countryCode, destination.regionCode)
  };
}

function quoteShippingRegionCode(quote: CartQuote | null) {
  if (!quote || !('regionCode' in quote.shipping)) {
    return null;
  }
  return quote.shipping.regionCode ?? null;
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

function destinationsMatch(left: QuoteDestination, right: QuoteDestination) {
  if (left.countryCode !== right.countryCode) {
    return false;
  }
  return left.countryCode !== 'US' || left.regionCode === right.regionCode;
}

function quoteMatchesDestination(quote: CartQuote, destination: QuoteDestination) {
  const quoted = quoteDestination(quote);
  if (!quoted || quoted.countryCode !== destination.countryCode) {
    return false;
  }
  return quoted.countryCode !== 'US' || quoted.regionCode === destination.regionCode;
}

function addressesEqual(left: ShippingAddress, right: ShippingAddress) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function activeDiscountCode(quote: CartQuote | null) {
  return quote?.discount.status === 'applied' ? quote.discount.code : null;
}

function quoteIntentLines(quote: Pick<CartQuote, 'lines' | 'quotedAt'>): CartIntentLine[] {
  return quote.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.requestedQuantity,
    marketAtAdd: line.marketAtAdd,
    addedAt: quote.quotedAt,
    updatedAt: quote.quotedAt
  }));
}

// Physical intent (`requestedQuantity > 0`) keeps destination authority alive across
// upstream cart updates even if a line is currently unavailable, whereas shippable
// physical lines (`quantity > 0`) govern shipping address visibility and submission.
function hasPhysicalIntent(quote: CartQuote) {
  return quote.lines.some(
    (line) => line.fulfillmentType === 'physical' && line.requestedQuantity > 0
  );
}

function shippablePhysicalLineCount(quote: CartQuote | null) {
  if (!quote) return 0;
  return quote.lines.filter(
    (line) => line.fulfillmentType === 'physical' && line.quantity > 0
  ).length;
}

function prefillDestination({
  market,
  savedDestination,
  quotedDestination
}: {
  market: MarketCode;
  savedDestination?: QuoteDestination | null;
  quotedDestination?: QuoteDestination | null;
}): QuoteDestination {
  const savedCountry = normalizeCode(savedDestination?.countryCode, 2);
  if (savedCountry) {
    return {
      countryCode: savedCountry,
      regionCode: normalizeCode(savedDestination?.regionCode, 3)
    };
  }

  const quotedCountry = normalizeCode(quotedDestination?.countryCode, 2);
  if (quotedCountry) {
    return {
      countryCode: quotedCountry,
      regionCode: normalizeCode(quotedDestination?.regionCode, 3)
    };
  }

  return market === 'vn'
    ? { countryCode: 'VN', regionCode: null }
    : { countryCode: null, regionCode: null };
}

function appliedDiscountMinor(quote: CartQuote) {
  return quote.discount.status === 'applied' ? quote.discount.amountMinor : 0;
}

function shippingEvidence(quote: CartQuote) {
  const shipping = quote.shipping;
  if (shipping.status !== 'ready') {
    return JSON.stringify({
      status: shipping.status,
      countryCode: 'countryCode' in shipping ? shipping.countryCode : null,
      regionCode: 'regionCode' in shipping ? (shipping.regionCode ?? null) : null,
      unsupportedLineIds:
        'unsupportedLineIds' in shipping ? [...shipping.unsupportedLineIds].sort() : []
    });
  }

  return JSON.stringify({
    status: shipping.status,
    version: shipping.version ?? null,
    countryCode: shipping.countryCode,
    regionCode: shipping.regionCode ?? null,
    allocations: (shipping.allocations ?? [])
      .map((allocation) => ({ ...allocation }))
      .sort((left, right) => left.lineId.localeCompare(right.lineId))
  });
}

function diffMaterialQuotes(previous: CartQuote, current: CartQuote): MaterialQuoteChange[] {
  const changes: MaterialQuoteChange[] = [];
  if (previous.market !== current.market) {
    changes.push({
      type: 'market_changed',
      previousMarket: previous.market,
      currentMarket: current.market
    });
  }
  if (previous.currencyCode !== current.currencyCode) {
    changes.push({
      type: 'currency_changed',
      previousCurrency: previous.currencyCode,
      currentCurrency: current.currencyCode
    });
  }
  if (
    previous.shipping.amountMinor !== current.shipping.amountMinor ||
    shippingEvidence(previous) !== shippingEvidence(current)
  ) {
    changes.push({
      type: 'shipping_changed',
      previousAmountMinor: previous.shipping.amountMinor,
      currentAmountMinor: current.shipping.amountMinor
    });
  }

  const previousLines = new Map(previous.lines.map((line) => [line.lineId, line]));
  const currentLines = new Map(current.lines.map((line) => [line.lineId, line]));
  const lineIds = new Set([...previousLines.keys(), ...currentLines.keys()]);
  for (const lineId of [...lineIds].sort()) {
    const before = previousLines.get(lineId);
    const after = currentLines.get(lineId);
    if (
      !before ||
      !after ||
      before.status !== after.status ||
      before.lineSubtotalMinor !== after.lineSubtotalMinor
    ) {
      changes.push({
        type: 'line_changed',
        lineId,
        title: after?.title ?? before?.title ?? 'Cart line',
        previousStatus: before?.status ?? 'missing',
        currentStatus: after?.status ?? 'missing',
        previousSubtotalMinor: before?.lineSubtotalMinor ?? 0,
        currentSubtotalMinor: after?.lineSubtotalMinor ?? 0
      });
    }
  }

  // Compare totals net of the applied discount so applying/removing a discount
  // alone skips the modal while a simultaneous price move still trips it.
  if (
    previous.totalMinor + appliedDiscountMinor(previous) !==
    current.totalMinor + appliedDiscountMinor(current)
  ) {
    changes.push({
      type: 'total_changed',
      previousTotalMinor: previous.totalMinor,
      currentTotalMinor: current.totalMinor
    });
  }

  return changes;
}

function diffCartLineChanges(previous: CartQuote, current: CartQuote): CartLineChange[] {
  const currentByLine = new Map(current.lines.map((line) => [line.lineId, line]));
  return previous.lines.flatMap((line) => {
    const next = currentByLine.get(line.lineId);
    if (!next) return [];
    const changes: CartLineChange[] = [];
    if (line.unitPriceMinor !== next.unitPriceMinor) {
      changes.push({ type: 'price_changed', lineId: line.lineId });
    }
    if (line.status !== next.status) {
      changes.push({ type: 'availability_changed', lineId: line.lineId });
    }
    return changes;
  });
}

function proposalNeedsReview({
  source,
  materialChanges,
  cartChanges
}: {
  source: QuoteChangeSource;
  materialChanges: readonly MaterialQuoteChange[];
  cartChanges: readonly CartLineChange[];
}) {
  if (source === 'prefill') {
    return false;
  }
  if (source !== 'destination') {
    return true;
  }
  if (cartChanges.length > 0) {
    return true;
  }
  return materialChanges.some((change) => !DESTINATION_EXPECTED_CHANGES.has(change.type));
}

function buildShippingNotice(previous: CartQuote, current: CartQuote): ShippingChangeNotice | null {
  if (current.shipping.status !== 'ready') {
    return null;
  }
  if (previous.shipping.status !== 'ready') {
    return {
      kind: 'calculated',
      previousAmountMinor: null,
      currentAmountMinor: current.shipping.amountMinor
    };
  }
  if (previous.shipping.amountMinor === current.shipping.amountMinor) {
    return null;
  }
  return {
    kind: 'updated',
    previousAmountMinor: previous.shipping.amountMinor,
    currentAmountMinor: current.shipping.amountMinor
  };
}

function canSubmitAcceptedQuoteState({
  acceptedQuote,
  destination,
  activeRequestId,
  proposal,
  issue,
  shippingAddress
}: {
  acceptedQuote: CartQuote | null;
  destination: QuoteDestination;
  activeRequestId: number | null;
  proposal: CheckoutSessionSnapshot['proposal'];
  issue: CheckoutQuoteIssue | null;
  shippingAddress: ShippingAddress | null;
}) {
  if (
    !acceptedQuote ||
    acceptedQuote.status !== 'ready' ||
    activeRequestId !== null ||
    proposal ||
    issue
  ) {
    return false;
  }

  const hasPhysicalLines = quoteHasPhysicalLines(acceptedQuote);
  const validation = validateShippingDestination(shippingAddress, {
    mode: 'final',
    hasPhysicalLines
  });
  if (!validation.success) {
    return false;
  }
  if (!hasPhysicalLines) {
    return true;
  }

  const quoted = normalizeDestination({
    countryCode: quoteShippingCountryCode(acceptedQuote),
    regionCode: quoteShippingRegionCode(acceptedQuote)
  });
  const current = normalizeDestination({
    countryCode: shippingAddress?.countryCode ?? destination.countryCode,
    regionCode: resolverRegionCode(
      shippingAddress?.countryCode ?? destination.countryCode,
      shippingAddress?.region ?? destination.regionCode
    )
  });
  return destinationsMatch(current, quoted);
}

/**
 * Deep Checkout Session module: owns Quote lifecycle, Destination Authority,
 * Editable Draft synchronization, Material Proposal gating, and ASVS L1
 * single-flight order submission behind one port-based seam.
 */
export function createCheckoutSession(
  config: CheckoutSessionConfig,
  ports: CheckoutSessionPorts
): CheckoutSession {
  const listeners = new Set<() => void>();
  let disposed = false;

  let isSignedIn = config.isSignedIn;
  let savedShippingAddress = config.savedShippingAddress ?? null;
  let upstreamCart: UpstreamCartState = config.initialCart ?? {
    quote: null,
    lines: null,
    hasCart: false,
    pending: false
  };

  let email = config.initialEmail ?? '';
  let contactReady = false;
  let shippingAddress: ShippingAddress = savedShippingAddress ?? emptyShippingAddress;
  let destinationExpanded = !savedShippingAddress;
  let saveAddress = false;
  let draftHydrated = false;
  let editableInteracted = false;

  let acceptedQuote: CartQuote | null = null;
  let destination: QuoteDestination = normalizeDestination({});
  let proposal: CheckoutSessionSnapshot['proposal'] = null;
  let activeRequestId: number | null = null;
  let lastRequestId = 0;
  let loadingMode: 'initial' | 'updating' | null = null;
  let quoteIssue: CheckoutQuoteIssue | null = null;
  let shippingNotice: CheckoutSessionSnapshot['shippingNotice'] = null;

  let destinationAuthority = false;
  let prefillRequestKey: string | null = null;
  let lastReconciledQuote: CartQuote | null = null;
  let lastReconciledSavedAddressKey = JSON.stringify(savedShippingAddress);

  let submitStage: SubmitStage = 'idle';
  let submitAttempted = false;
  let submitResult: SubmitCheckoutActionState | null = null;
  let dedupeGuaranteed = true;
  let addressSaveWarning = false;
  let submitInFlight = false;
  let resumeSubmitAfterReview = false;
  let idempotencyInMemory: ResolvedIdempotency | null = null;

  const pendingDiscountResolvers = new Map<number, (outcome: DiscountApplyOutcome) => void>();

  function resolveSupersededDiscounts() {
    for (const [requestId, resolve] of pendingDiscountResolvers) {
      pendingDiscountResolvers.delete(requestId);
      resolve({ status: 'failed', quoteHash: null });
    }
  }

  function buildSnapshot(): CheckoutSessionSnapshot {
    const paymentIntent = checkoutPaymentIntentForQuote(acceptedQuote);
    const physicalCount = shippablePhysicalLineCount(acceptedQuote);
    const hasShippable = physicalCount > 0;
    const shippingAddressReady = canSubmitAcceptedQuoteState({
      acceptedQuote,
      destination,
      activeRequestId,
      proposal,
      issue: quoteIssue,
      shippingAddress: hasShippable ? shippingAddress : null
    });
    const submitting = submitStage !== 'idle';
    const readyToSubmit =
      Boolean(acceptedQuote) &&
      acceptedQuote?.status === 'ready' &&
      acceptedQuote.shipping.status !== 'not_calculated' &&
      (!hasShippable || acceptedQuote.shipping.status === 'ready') &&
      shippingAddressReady &&
      contactReady &&
      paymentIntent !== null &&
      !submitting;

    const readinessIssues: ReadinessIssueCode[] = [];
    const addIssue = (code: ReadinessIssueCode) => {
      if (!readinessIssues.includes(code)) readinessIssues.push(code);
    };
    if (!acceptedQuote || acceptedQuote.lines.length === 0) addIssue('missing_quote');
    if (!contactReady) addIssue('missing_contact');
    if (!paymentIntent) addIssue('missing_payment');
    if (hasShippable && !shippingAddressReady) addIssue('missing_shipping');
    if (hasShippable && acceptedQuote?.shipping.status === 'not_calculated') {
      addIssue('missing_shipping');
    }
    if (hasShippable && acceptedQuote?.shipping.status === 'unsupported_destination') {
      addIssue('unsupported_shipping');
    }

    const controlsDisabled = submitting || activeRequestId !== null || upstreamCart.pending;
    const actionDisabled =
      controlsDisabled ||
      Boolean(proposal) ||
      Boolean(quoteIssue) ||
      !acceptedQuote ||
      acceptedQuote.lines.length === 0 ||
      acceptedQuote.status !== 'ready' ||
      paymentIntent === null;

    let actionBlocker: ActionBlockerCode | null = null;
    if (activeRequestId !== null) {
      actionBlocker = 'updating_total';
    } else if (proposal) {
      actionBlocker = 'review_updated_total';
    } else if (acceptedQuote?.status === 'blocked') {
      actionBlocker = 'blocked_items';
    } else if (quoteIssue) {
      actionBlocker =
        quoteIssue.kind === 'unsupported'
          ? 'quote_unsupported'
          : quoteIssue.kind === 'network'
            ? 'quote_network'
            : 'quote_server';
    }

    const isEmpty =
      acceptedQuote?.status === 'empty' ||
      (!upstreamCart.pending && upstreamCart.hasCart && (upstreamCart.lines?.length ?? 0) === 0);

    const submitError =
      submitResult && submitResult.status !== 'success'
        ? presentSubmitError(submitResult, { dedupeGuaranteed })
        : null;

    return Object.freeze({
      acceptedQuote,
      paymentIntent,
      destinationStatus: Object.freeze({
        destination,
        loadingMode,
        isPending: activeRequestId !== null,
        issue: quoteIssue
      }),
      proposal,
      shippingNotice,
      email,
      contactReady,
      shippingAddress,
      destinationExpanded,
      saveAddress,
      draftHydrated,
      submitAttempted,
      isEmpty,
      hasShippablePhysicalLines: hasShippable,
      shippingAddressReady,
      readyToSubmit,
      controlsDisabled,
      actionDisabled,
      actionBlocker,
      readinessIssues: Object.freeze(readinessIssues),
      submitStage,
      submitResult,
      submitError,
      dedupeGuaranteed,
      addressSaveWarning
    });
  }

  let currentSnapshot = buildSnapshot();

  function commit() {
    if (disposed) return;
    currentSnapshot = buildSnapshot();
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function persistDraftIfDirty() {
    if (!draftHydrated || !editableInteracted) return;
    writeEditableDraft({
      storage: ports.getStorage(),
      scope: config.draftScope,
      draft: { email, shippingAddress }
    });
  }

  function beginInteraction() {
    submitResult = null;
    shippingNotice = null;
  }

  function resolveFocusTarget(): CheckoutFocusTarget | null {
    if (!contactReady) return 'contact';
    if (hasPhysicalShippingIssue()) return 'destination';
    return null;
  }

  function hasPhysicalShippingIssue() {
    const hasShippable = shippablePhysicalLineCount(acceptedQuote) > 0;
    if (!hasShippable) return false;
    const ready = canSubmitAcceptedQuoteState({
      acceptedQuote,
      destination,
      activeRequestId,
      proposal,
      issue: quoteIssue,
      shippingAddress
    });
    return !ready || acceptedQuote?.shipping.status === 'unsupported_destination';
  }

  function settleQuote(requestId: number, source: QuoteChangeSource, settlement: QuoteSettlement) {
    if (disposed || requestId !== activeRequestId) {
      return false;
    }

    activeRequestId = null;
    loadingMode = null;

    if (settlement.status !== 'ready') {
      const kind =
        settlement.status === 'unsupported'
          ? 'unsupported'
          : settlement.status === 'network_error'
            ? 'network'
            : 'server';
      proposal = null;
      quoteIssue = { kind, code: settlement.code ?? null };
      commit();
      return true;
    }

    if (settlement.quote.shipping.status === 'unsupported_destination') {
      proposal = null;
      quoteIssue = {
        kind: 'unsupported',
        code: settlement.quote.shipping.failureCode ?? null
      };
      commit();
      return true;
    }

    quoteIssue = null;

    if (source === 'prefill' || !acceptedQuote) {
      acceptedQuote = settlement.quote;
      proposal = null;
      shippingNotice = null;
      commit();
      return true;
    }

    const previousAccepted = acceptedQuote;
    const materialChanges = diffMaterialQuotes(previousAccepted, settlement.quote);
    const cartChanges = diffCartLineChanges(previousAccepted, settlement.quote);

    if (materialChanges.length === 0 && cartChanges.length === 0) {
      acceptedQuote = settlement.quote;
      proposal = null;
      shippingNotice = null;
      commit();
      return true;
    }

    if (!proposalNeedsReview({ source, materialChanges, cartChanges })) {
      const notice = buildShippingNotice(previousAccepted, settlement.quote);
      acceptedQuote = settlement.quote;
      proposal = null;
      shippingNotice =
        notice && settlement.quote.currencyCode
          ? { notice, currencyCode: settlement.quote.currencyCode }
          : null;
      commit();
      return true;
    }

    proposal = Object.freeze({ quote: settlement.quote, materialChanges });
    shippingNotice = null;
    commit();
    return true;
  }

  async function requestQuote(
    nextDestination: QuoteDestination,
    options: {
      nextAddress?: ShippingAddress;
      upstreamQuote?: CartQuote;
      source?: QuoteChangeSource;
      discountCodeOverride?: { code: string | null };
    } = {}
  ): Promise<{ owned: boolean; requestId: number }> {
    const source = options.source ?? 'destination';
    beginInteraction();
    if (source !== 'submit') {
      resumeSubmitAfterReview = false;
    }
    if (source !== 'upstream') {
      destinationAuthority = Boolean(nextDestination.countryCode);
    }

    resolveSupersededDiscounts();

    const normalizedDestination = normalizeDestination(nextDestination);
    const requestId = lastRequestId + 1;
    lastRequestId = requestId;
    destination = normalizedDestination;
    proposal = null;
    activeRequestId = requestId;
    loadingMode = acceptedQuote ? 'updating' : 'initial';
    quoteIssue = null;
    if (options.nextAddress) {
      shippingAddress = options.nextAddress;
      persistDraftIfDirty();
    }
    commit();

    const baseQuote = options.upstreamQuote ?? acceptedQuote;
    const lines = baseQuote ? quoteIntentLines(baseQuote) : [...(upstreamCart.lines ?? [])];
    const market =
      baseQuote?.market ??
      (normalizedDestination.countryCode
        ? suggestMarketFromCountry(normalizedDestination.countryCode)
        : config.locale === 'vi'
          ? 'vn'
          : 'intl');

    try {
      const result = await ports.refreshQuote({
        locale: config.locale,
        market,
        lines,
        destinationCountryCode: normalizedDestination.countryCode,
        destinationRegionCode: normalizedDestination.regionCode,
        shippingQuoteVersion: 2,
        discountCode: options.discountCodeOverride
          ? options.discountCodeOverride.code
          : activeDiscountCode(baseQuote),
        priorAcceptedQuoteHash: acceptedQuote?.hash ?? null
      });
      const settlement: QuoteSettlement =
        result.status === 'success'
          ? { status: 'ready', quote: result.quote }
          : {
              status: result.status === 'invalid' ? 'server_error' : 'network_error',
              code: result.code
            };
      const owned = settleQuote(requestId, source, settlement);
      return { owned, requestId };
    } catch {
      const owned = settleQuote(requestId, source, { status: 'network_error' });
      return { owned, requestId };
    }
  }

  function reconcileUpstreamQuote() {
    const quote = upstreamCart.quote;
    if (!draftHydrated || !quote || disposed) {
      return;
    }
    lastReconciledQuote = quote;
    lastReconciledSavedAddressKey = JSON.stringify(savedShippingAddress);

    const hasPhysical = hasPhysicalIntent(quote);
    if (destinationAuthority && Boolean(destination.countryCode) && hasPhysical) {
      void requestQuote(destination, { upstreamQuote: quote, source: 'upstream' });
      return;
    }

    if (!hasPhysical) {
      destinationAuthority = false;
      prefillRequestKey = null;
      acceptedQuote = quote;
      destination = normalizeDestination({
        countryCode: quoteShippingCountryCode(quote),
        regionCode: quoteShippingRegionCode(quote)
      });
      proposal = null;
      activeRequestId = null;
      loadingMode = null;
      quoteIssue = null;
      commit();
      return;
    }

    const prefill = prefillDestination({
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
          ...shippingAddress,
          countryCode: prefill.countryCode ?? '',
          region: prefill.regionCode
        };
    const nextDestination = normalizeDestination(prefill);

    if (!addressesEqual(shippingAddress, nextAddress)) {
      shippingAddress = nextAddress;
    }
    acceptedQuote = quote;
    destination = nextDestination;
    proposal = null;
    activeRequestId = null;
    loadingMode = null;
    quoteIssue = null;
    commit();

    if (!nextDestination.countryCode) return;
    destinationAuthority = true;
    if (quoteMatchesDestination(quote, nextDestination)) return;

    const requestKey = `${quote.hash}:${nextDestination.countryCode}:${nextDestination.regionCode ?? ''}`;
    if (prefillRequestKey === requestKey) return;
    prefillRequestKey = requestKey;
    void requestQuote(nextDestination, {
      nextAddress,
      upstreamQuote: quote,
      source: 'prefill'
    });
  }

  function resolveSessionIdempotency(quoteHash: string) {
    const mint = ports.mintIdempotencyKey
      ? () => ports.mintIdempotencyKey!(quoteHash)
      : () => `checkout-${quoteHash.slice(0, 24)}-${globalThis.crypto.randomUUID()}`;
    const resolved = resolveIdempotencyKey({
      storage: ports.getStorage(),
      quoteHash,
      inMemory: idempotencyInMemory,
      mintKey: mint
    });
    idempotencyInMemory = resolved;
    dedupeGuaranteed = !isSignedIn || resolved.persisted;
    return resolved.key;
  }

  async function placeOrderForQuote(
    refreshedQuote: CartQuote,
    quotePaymentIntent: CheckoutPaymentIntent
  ): Promise<SubmitOutcome> {
    if (!upstreamCart.hasCart || disposed) {
      return { status: 'aborted' };
    }

    const physicalLines = shippablePhysicalLineCount(refreshedQuote);
    const idempotencyKey = resolveSessionIdempotency(refreshedQuote.hash);
    const submitInput: CheckoutSubmitPayload = {
      locale: config.locale,
      market: refreshedQuote.market,
      lines: quoteIntentLines(refreshedQuote),
      acceptedQuote: refreshedQuote,
      acceptedQuoteHash: refreshedQuote.hash,
      idempotencyKey,
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

    submitStage = 'creating-order';
    commit();

    const prepared = await ports.prepareGuestRecovery({
      acceptedQuote: refreshedQuote,
      acceptedQuoteHash: submitInput.acceptedQuoteHash,
      contactEmail: submitInput.contactEmail,
      paymentIntent: submitInput.paymentIntent
    });
    if (disposed) {
      return { status: 'aborted' };
    }

    const result: SubmitCheckoutActionState =
      prepared.status === 'ready'
        ? await ports.submitOrder(submitInput)
        : { status: 'invalid', code: prepared.code };
    if (disposed) {
      return { status: 'aborted' };
    }

    submitResult = result;

    if (result.status === 'success') {
      const completedLines: CompletedOrderLine[] = refreshedQuote.lines
        .filter(
          (line) =>
            (line.status === 'ready' || line.status === 'quantity_capped') && line.quantity > 0
        )
        .map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity
        }));

      const storage = ports.getStorage();
      clearEditableDraft(storage);
      clearStoredIdempotency(storage);
      idempotencyInMemory = null;

      if (isSignedIn && saveAddress && physicalLines > 0) {
        try {
          const saveResult = await ports.saveShippingAddress({
            locale: config.locale,
            address: {
              label: shippingAddress.recipientName.trim().slice(0, 80),
              ...shippingAddress,
              isDefault: false
            }
          });
          if (!disposed) {
            addressSaveWarning = saveResult.status !== 'saved';
          }
        } catch {
          if (!disposed) {
            addressSaveWarning = true;
          }
        }
        if (disposed) {
          return { status: 'aborted' };
        }
      }

      commit();
      ports.onOrderCreated({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        reservationExpiresAt: result.reservationExpiresAt,
        orderPath: result.orderPath,
        completedLines
      });

      return {
        status: 'submitted',
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        reservationExpiresAt: result.reservationExpiresAt,
        orderPath: result.orderPath,
        completedLines
      };
    }

    const presentation = presentSubmitError(result, { dedupeGuaranteed });
    const focusTarget = presentation.focusTarget ?? null;
    if (focusTarget === 'destination') {
      destinationExpanded = true;
    }
    commit();

    return { status: 'failed', result, focusTarget };
  }

  return {
    getSnapshot() {
      return currentSnapshot;
    },

    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    hydrateDraft() {
      if (draftHydrated || disposed) return;
      const result = readEditableDraft({
        storage: ports.getStorage(),
        scope: config.draftScope
      });
      if (result.status === 'found') {
        const restored = result.draft.shippingAddress;
        email = result.draft.email;
        shippingAddress = restored;
        destinationExpanded = true;
        destinationAuthority = Boolean(restored.countryCode);
        destination = normalizeDestination({
          countryCode: restored.countryCode || null,
          regionCode: restored.countryCode === 'US' ? restored.region : null
        });
      }
      draftHydrated = true;
      commit();
      if (upstreamCart.quote) {
        reconcileUpstreamQuote();
      }
    },

    syncCart(upstream, options) {
      if (disposed) return;

      const prevSavedKey = JSON.stringify(savedShippingAddress);
      if (options?.savedShippingAddress !== undefined) {
        savedShippingAddress = options.savedShippingAddress ?? null;
      }
      if (options?.isSignedIn !== undefined) {
        isSignedIn = options.isSignedIn;
        dedupeGuaranteed = !isSignedIn || (idempotencyInMemory?.persisted ?? true);
      }
      upstreamCart = upstream;

      const nextSavedKey = JSON.stringify(savedShippingAddress);
      const quoteChanged = upstream.quote !== lastReconciledQuote;
      const savedAddressChanged =
        nextSavedKey !== prevSavedKey || nextSavedKey !== lastReconciledSavedAddressKey;

      if (draftHydrated && upstream.quote && (quoteChanged || savedAddressChanged)) {
        reconcileUpstreamQuote();
        return;
      }

      commit();
    },

    setEmail(nextEmail) {
      if (disposed) return;
      editableInteracted = true;
      beginInteraction();
      email = nextEmail;
      persistDraftIfDirty();
      commit();
    },

    setContactReady(ready) {
      if (disposed || contactReady === ready) return;
      contactReady = ready;
      commit();
    },

    updateShippingAddress(nextAddress) {
      if (disposed) return;
      editableInteracted = true;
      beginInteraction();
      shippingAddress = nextAddress;
      persistDraftIfDirty();
      commit();
    },

    async changeDestination(nextDestination) {
      if (disposed) return;
      await requestQuote(nextDestination, { source: 'destination' });
    },

    async applySavedAddress(address) {
      if (disposed) return;
      editableInteracted = true;
      destinationExpanded = false;
      await requestQuote(
        { countryCode: address.countryCode, regionCode: address.region },
        { nextAddress: address, source: 'destination' }
      );
    },

    setDestinationExpanded(expanded) {
      if (disposed || destinationExpanded === expanded) return;
      destinationExpanded = expanded;
      commit();
    },

    setSaveAddress(save) {
      if (disposed || saveAddress === save) return;
      saveAddress = save;
      commit();
    },

    async applyDiscount(code) {
      if (disposed || !acceptedQuote) {
        return { status: 'failed', quoteHash: null };
      }

      let resolver!: (outcome: DiscountApplyOutcome) => void;
      const outcomePromise = new Promise<DiscountApplyOutcome>((resolve) => {
        resolver = resolve;
      });

      const requestPromise = requestQuote(destination, {
        upstreamQuote: acceptedQuote,
        source: 'discount',
        discountCodeOverride: { code }
      });

      const targetRequestId = lastRequestId;
      pendingDiscountResolvers.set(targetRequestId, resolver);

      void requestPromise.then(({ owned, requestId }) => {
        const settleResolve = pendingDiscountResolvers.get(requestId);
        if (!settleResolve) {
          return;
        }
        pendingDiscountResolvers.delete(requestId);

        if (!owned || disposed || quoteIssue) {
          settleResolve({ status: 'failed', quoteHash: null });
          return;
        }
        const settledQuote = proposal?.quote ?? acceptedQuote;
        if (!settledQuote) {
          settleResolve({ status: 'failed', quoteHash: null });
          return;
        }
        settleResolve({
          status: settledQuote.discount.status === 'not_eligible' ? 'not_eligible' : 'applied',
          quoteHash: settledQuote.hash
        });
      });

      return outcomePromise;
    },

    async retryQuote() {
      if (disposed) return;
      await requestQuote(destination, {
        upstreamQuote: acceptedQuote ?? undefined,
        source: 'destination'
      });
    },

    async acceptProposalAndResume() {
      if (disposed) return { status: 'aborted' };

      beginInteraction();
      if (!proposal || activeRequestId !== null) {
        commit();
        return { status: 'accepted' };
      }

      acceptedQuote = proposal.quote;
      proposal = null;
      quoteIssue = null;
      const shouldResume = resumeSubmitAfterReview;
      resumeSubmitAfterReview = false;
      commit();

      if (!shouldResume) {
        return { status: 'accepted' };
      }

      const quote = acceptedQuote;
      if (!quote || submitInFlight || disposed) {
        return { status: 'ignored' };
      }

      const physicalLines = shippablePhysicalLineCount(quote);
      const reviewedPaymentIntent = checkoutPaymentIntentForQuote(quote);
      const addressReady = canSubmitAcceptedQuoteState({
        acceptedQuote: quote,
        destination,
        activeRequestId,
        proposal,
        issue: quoteIssue,
        shippingAddress: physicalLines > 0 ? shippingAddress : null
      });

      if (
        !contactReady ||
        !reviewedPaymentIntent ||
        (physicalLines > 0 && quote.shipping.status !== 'ready') ||
        !addressReady
      ) {
        const focusTarget = resolveFocusTarget();
        if (focusTarget === 'destination') {
          destinationExpanded = true;
          commit();
        }
        return { status: 'invalid', focusTarget };
      }

      submitInFlight = true;
      try {
        return await placeOrderForQuote(quote, reviewedPaymentIntent);
      } catch {
        if (!disposed) {
          submitResult = { status: 'error', code: 'checkout_submit_failed' };
          commit();
          return {
            status: 'failed',
            result: submitResult,
            focusTarget: null
          };
        }
        return { status: 'aborted' };
      } finally {
        submitInFlight = false;
        submitStage = 'idle';
        commit();
      }
    },

    rejectProposal() {
      if (disposed) return;
      resumeSubmitAfterReview = false;
      const acceptedDestination = acceptedQuote ? quoteDestination(acceptedQuote) : null;
      const restoredDestination = normalizeDestination(
        acceptedDestination ?? { countryCode: null, regionCode: null }
      );

      beginInteraction();
      destinationExpanded = true;
      shippingAddress = {
        ...shippingAddress,
        countryCode: restoredDestination.countryCode ?? '',
        region: restoredDestination.regionCode
      };
      destination = restoredDestination;
      proposal = null;
      activeRequestId = null;
      loadingMode = null;
      quoteIssue = null;
      persistDraftIfDirty();
      commit();
    },

    async submit() {
      if (submitInFlight || disposed) {
        return { status: 'ignored' };
      }

      submitAttempted = true;
      if (!currentSnapshot.readyToSubmit) {
        const focusTarget = resolveFocusTarget();
        if (focusTarget === 'destination') {
          destinationExpanded = true;
        }
        commit();
        return { status: 'invalid', focusTarget };
      }

      const currentQuote = acceptedQuote;
      const currentPaymentIntent = checkoutPaymentIntentForQuote(currentQuote);
      if (!currentQuote || !upstreamCart.hasCart || !currentPaymentIntent) {
        commit();
        return { status: 'invalid', focusTarget: null };
      }

      submitInFlight = true;
      submitStage = 'checking-total';
      submitResult = null;
      commit();

      try {
        const { owned } = await requestQuote(destination, {
          upstreamQuote: currentQuote,
          source: 'submit'
        });
        if (disposed || !owned) {
          return { status: 'aborted' };
        }
        if (proposal) {
          resumeSubmitAfterReview = true;
          return { status: 'needs_review' };
        }

        const refreshedQuote = acceptedQuote;
        const refreshedPaymentIntent = checkoutPaymentIntentForQuote(refreshedQuote);
        if (
          !refreshedQuote ||
          activeRequestId !== null ||
          quoteIssue !== null ||
          !refreshedPaymentIntent
        ) {
          return { status: 'aborted' };
        }

        return await placeOrderForQuote(refreshedQuote, refreshedPaymentIntent);
      } catch {
        if (!disposed) {
          submitResult = { status: 'error', code: 'checkout_submit_failed' };
          commit();
          return {
            status: 'failed',
            result: submitResult,
            focusTarget: null
          };
        }
        return { status: 'aborted' };
      } finally {
        submitInFlight = false;
        submitStage = 'idle';
        commit();
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      resolveSupersededDiscounts();
      listeners.clear();
    }
  };
}
