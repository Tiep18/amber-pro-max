import {diffMaterialQuotes, type MaterialQuoteChange} from './market-revalidation';
import {
  quoteHasPhysicalLines,
  quoteShippingCountryCode,
  resolverRegionCode,
  validateShippingDestination,
  type ShippingAddress
} from './shipping-address';
import type {CartQuote} from './types';

export type QuoteDestination = {
  countryCode: string | null;
  regionCode: string | null;
};

export type CheckoutQuoteIssue =
  | {kind: 'unsupported'; code: string | null}
  | {kind: 'network'; code: string | null}
  | {kind: 'server'; code: string | null};

export type CheckoutQuoteProposal = {
  quote: CartQuote;
  materialChanges: MaterialQuoteChange[];
  cartChanges: CartQuoteChange[];
};

export type CartQuoteChange = {
  type: 'price_changed' | 'availability_changed';
  lineId: string;
};

export type CheckoutQuoteLifecycleState = {
  destination: QuoteDestination;
  acceptedQuote: CartQuote | null;
  proposal: CheckoutQuoteProposal | null;
  activeRequestId: number | null;
  lastRequestId: number;
  loadingMode: 'initial' | 'updating' | null;
  issue: CheckoutQuoteIssue | null;
};

export type QuoteRequest = {
  requestId: number;
  destination: QuoteDestination;
};

export type QuoteRequestResult =
  | {status: 'ready'; quote: CartQuote}
  | {status: 'unsupported'; code?: string | null}
  | {status: 'network_error'; code?: string | null}
  | {status: 'server_error'; code?: string | null};

export function createCheckoutQuoteLifecycleState(
  acceptedQuote: CartQuote | null = null,
  destination?: Partial<QuoteDestination>
): CheckoutQuoteLifecycleState {
  return {
    destination: normalizeDestination(
      destination ?? {
        countryCode: quoteShippingCountryCode(acceptedQuote),
        regionCode: quoteShippingRegionCode(acceptedQuote)
      }
    ),
    acceptedQuote,
    proposal: null,
    activeRequestId: null,
    lastRequestId: 0,
    loadingMode: null,
    issue: null
  };
}

export function normalizeDestination(destination: Partial<QuoteDestination>): QuoteDestination {
  const countryCode = normalizeCode(destination.countryCode, 2);
  return {
    countryCode,
    regionCode: resolverRegionCode(countryCode, destination.regionCode)
  };
}

export function beginQuoteRequest(
  state: CheckoutQuoteLifecycleState,
  destination: Partial<QuoteDestination>
): {state: CheckoutQuoteLifecycleState; request: QuoteRequest} {
  const normalizedDestination = normalizeDestination(destination);
  const requestId = state.lastRequestId + 1;
  return {
    request: {requestId, destination: normalizedDestination},
    state: {
      ...state,
      destination: normalizedDestination,
      proposal: null,
      activeRequestId: requestId,
      lastRequestId: requestId,
      loadingMode: state.acceptedQuote ? 'updating' : 'initial',
      issue: null
    }
  };
}

export function settleQuoteRequest(
  state: CheckoutQuoteLifecycleState,
  requestId: number,
  result: QuoteRequestResult
): CheckoutQuoteLifecycleState {
  if (requestId !== state.activeRequestId) {
    return state;
  }

  const settled = {...state, activeRequestId: null, loadingMode: null} as CheckoutQuoteLifecycleState;
  if (result.status !== 'ready') {
    const kind =
      result.status === 'unsupported'
        ? 'unsupported'
        : result.status === 'network_error'
          ? 'network'
          : 'server';
    return {...settled, proposal: null, issue: {kind, code: result.code ?? null}};
  }

  if (result.quote.shipping.status === 'unsupported_destination') {
    return {
      ...settled,
      proposal: null,
      issue: {kind: 'unsupported', code: result.quote.shipping.failureCode ?? null}
    };
  }

  if (!state.acceptedQuote) {
    return {...settled, acceptedQuote: result.quote, proposal: null, issue: null};
  }

  const materialChanges = diffMaterialQuotes(state.acceptedQuote, result.quote);
  const cartChanges = diffLifecycleCartQuotes(state.acceptedQuote, result.quote);
  if (materialChanges.length > 0 || cartChanges.length > 0) {
    return {
      ...settled,
      proposal: {quote: result.quote, materialChanges, cartChanges},
      issue: null
    };
  }

  return {...settled, acceptedQuote: result.quote, proposal: null, issue: null};
}

export function acceptQuoteProposal(state: CheckoutQuoteLifecycleState): CheckoutQuoteLifecycleState {
  if (!state.proposal || state.activeRequestId !== null) {
    return state;
  }
  return {...state, acceptedQuote: state.proposal.quote, proposal: null, issue: null};
}

export function reviewDestination(
  state: CheckoutQuoteLifecycleState,
  destination: Partial<QuoteDestination>
): CheckoutQuoteLifecycleState {
  return {
    ...state,
    destination: normalizeDestination(destination),
    proposal: null,
    activeRequestId: null,
    loadingMode: null,
    issue: null
  };
}

export function canSubmitAcceptedQuote(
  state: CheckoutQuoteLifecycleState,
  shippingAddress: ShippingAddress | null
): boolean {
  if (
    !state.acceptedQuote ||
    state.acceptedQuote.status !== 'ready' ||
    state.activeRequestId !== null ||
    state.proposal ||
    state.issue
  ) {
    return false;
  }

  const hasPhysicalLines = quoteHasPhysicalLines(state.acceptedQuote);
  const validation = validateShippingDestination(shippingAddress, {mode: 'final', hasPhysicalLines});
  if (!validation.success) {
    return false;
  }
  if (!hasPhysicalLines) {
    return true;
  }

  const quoteDestination = normalizeDestination({
    countryCode: quoteShippingCountryCode(state.acceptedQuote),
    regionCode: quoteShippingRegionCode(state.acceptedQuote)
  });
  const currentDestination = normalizeDestination({
    countryCode: shippingAddress?.countryCode ?? state.destination.countryCode,
    regionCode: resolverRegionCode(
      shippingAddress?.countryCode ?? state.destination.countryCode,
      shippingAddress?.region ?? state.destination.regionCode
    )
  });
  return destinationsMatch(currentDestination, quoteDestination);
}

function quoteShippingRegionCode(quote: CartQuote | null) {
  if (!quote || !('regionCode' in quote.shipping)) {
    return null;
  }
  return quote.shipping.regionCode ?? null;
}

function normalizeCode(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function destinationsMatch(left: QuoteDestination, right: QuoteDestination) {
  if (left.countryCode !== right.countryCode) {
    return false;
  }
  return left.countryCode !== 'US' || left.regionCode === right.regionCode;
}

function diffLifecycleCartQuotes(previous: CartQuote, current: CartQuote): CartQuoteChange[] {
  const currentByLine = new Map(current.lines.map((line) => [line.lineId, line]));
  return previous.lines.flatMap((line) => {
    const next = currentByLine.get(line.lineId);
    if (!next) return [];
    const changes: CartQuoteChange[] = [];
    if (line.unitPriceMinor !== next.unitPriceMinor) changes.push({type: 'price_changed', lineId: line.lineId});
    if (line.status !== next.status) changes.push({type: 'availability_changed', lineId: line.lineId});
    return changes;
  });
}
