import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import type {CartQuote, CartQuoteLine} from '@/checkout/types';
import type {CartIntentLine} from './types';

export type CartMarketChangeFact = {
  lineId: string;
  title: string;
  previous?: string | number | null;
  current?: string | number | null;
};

export type CartMarketGroupedChanges = {
  removed: CartMarketChangeFact[];
  unavailable: CartMarketChangeFact[];
  repriced: CartMarketChangeFact[];
  currencyChanged: CartMarketChangeFact[];
  quantityAdjusted: CartMarketChangeFact[];
};

export type CartMarketSyncIssue = {
  code: 'market_mutation_failed' | 'requote_failed';
  retryable: true;
};

export type CartMarketSyncState = {
  status: 'idle' | 'updating' | 'ready' | 'error';
  committedMarket: MarketCode;
  contextVersion: number;
  nextRequestId: number;
  activeRequestId: number | null;
  intentLines: CartIntentLine[];
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  changes: CartMarketGroupedChanges;
  issue: CartMarketSyncIssue | null;
  rollbackContext?: {
    market: MarketCode;
    contextVersion: number;
  } | null;
};

export type CartMarketRequoteRequest = {
  requestId: number;
  locale: Locale;
  lines: CartIntentLine[];
};

const EMPTY_CHANGES: CartMarketGroupedChanges = {
  removed: [],
  unavailable: [],
  repriced: [],
  currencyChanged: [],
  quantityAdjusted: []
};

export function emptyCartMarketChanges(): CartMarketGroupedChanges {
  return {
    removed: [],
    unavailable: [],
    repriced: [],
    currencyChanged: [],
    quantityAdjusted: []
  };
}

export function beginMarketRequote(
  state: CartMarketSyncState,
  input: {
    locale: Locale;
    committedMarket: MarketCode;
    contextVersion: number;
    lines: CartIntentLine[];
  }
): {state: CartMarketSyncState; request: CartMarketRequoteRequest} {
  const requestId = state.nextRequestId + 1;
  const previousQuote = state.quote ?? state.previousQuote;

  return {
    request: {
      requestId,
      locale: input.locale,
      lines: input.lines
    },
    state: {
      ...state,
      status: 'updating',
      committedMarket: input.committedMarket,
      contextVersion: input.contextVersion,
      nextRequestId: requestId,
      activeRequestId: requestId,
      intentLines: input.lines,
      quote: null,
      previousQuote,
      changes: EMPTY_CHANGES,
      issue: null,
      rollbackContext: {
        market: state.committedMarket,
        contextVersion: state.contextVersion
      }
    }
  };
}

export function settleMarketRequote(
  state: CartMarketSyncState,
  requestId: number,
  quote: CartQuote
): CartMarketSyncState {
  if (requestId !== state.activeRequestId) {
    return state;
  }

  if (quote.market !== state.committedMarket) {
    return failMarketRequote(state, requestId, {code: 'requote_failed'});
  }

  return {
    ...state,
    status: 'ready',
    activeRequestId: null,
    quote,
    changes: state.previousQuote
      ? diffMarketCartQuotes(state.previousQuote, quote)
      : emptyCartMarketChanges(),
    issue: null,
    rollbackContext: null
  };
}

export function failMarketRequote(
  state: CartMarketSyncState,
  requestId: number,
  issue: {code: CartMarketSyncIssue['code']; cause?: unknown}
): CartMarketSyncState {
  if (requestId !== state.activeRequestId) {
    return state;
  }

  const rollback =
    issue.code === 'market_mutation_failed' ? state.rollbackContext : null;

  return {
    ...state,
    status: 'error',
    committedMarket: rollback?.market ?? state.committedMarket,
    contextVersion: rollback?.contextVersion ?? state.contextVersion,
    activeRequestId: null,
    quote: null,
    changes: emptyCartMarketChanges(),
    issue: {code: issue.code, retryable: true},
    rollbackContext: null
  };
}

export function diffMarketCartQuotes(
  previous: CartQuote,
  current: CartQuote
): CartMarketGroupedChanges {
  const changes = emptyCartMarketChanges();
  const previousByLine = new Map(previous.lines.map((line) => [line.lineId, line]));
  const currentByLine = new Map(current.lines.map((line) => [line.lineId, line]));

  for (const before of previous.lines) {
    const after = currentByLine.get(before.lineId);
    if (!after) {
      changes.removed.push(lineFact(before));
      continue;
    }

    if (after.status === 'unavailable' || after.status === 'invalid_variant') {
      changes.unavailable.push(lineFact(after));
    }
    if (before.unitPriceMinor !== after.unitPriceMinor) {
      changes.repriced.push(
        lineFact(after, before.unitPriceMinor, after.unitPriceMinor)
      );
    }
    if (before.currencyCode !== after.currencyCode) {
      changes.currencyChanged.push(
        lineFact(after, before.currencyCode, after.currencyCode)
      );
    }
    if (before.quantity !== after.quantity) {
      changes.quantityAdjusted.push(
        lineFact(after, before.quantity, after.quantity)
      );
    }
  }

  for (const after of current.lines) {
    if (
      !previousByLine.has(after.lineId) &&
      (after.status === 'unavailable' || after.status === 'invalid_variant')
    ) {
      changes.unavailable.push(lineFact(after));
    }
  }

  return changes;
}

function lineFact(
  line: CartQuoteLine,
  previous?: string | number | null,
  current?: string | number | null
): CartMarketChangeFact {
  return {
    lineId: line.lineId,
    title: line.title,
    ...(previous !== undefined ? {previous} : {}),
    ...(current !== undefined ? {current} : {})
  };
}
