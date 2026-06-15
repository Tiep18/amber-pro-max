import {suggestMarketFromCountry, type MarketCode} from '@/catalog/market';
import type {CartQuote, CartQuoteLine} from './types';

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

function lineMap(quote: CartQuote) {
  return new Map(quote.lines.map((line) => [line.lineId, line]));
}

function shippingAmount(quote: CartQuote) {
  return quote.shipping.amountMinor;
}

export function marketForDestination(countryCode: string | null | undefined): MarketCode {
  return suggestMarketFromCountry(countryCode);
}

export function diffMaterialQuotes(previous: CartQuote, current: CartQuote): MaterialQuoteChange[] {
  const changes: MaterialQuoteChange[] = [];
  if (previous.market !== current.market) {
    changes.push({type: 'market_changed', previousMarket: previous.market, currentMarket: current.market});
  }
  if (previous.currencyCode !== current.currencyCode) {
    changes.push({type: 'currency_changed', previousCurrency: previous.currencyCode, currentCurrency: current.currencyCode});
  }
  if (shippingAmount(previous) !== shippingAmount(current)) {
    changes.push({
      type: 'shipping_changed',
      previousAmountMinor: shippingAmount(previous),
      currentAmountMinor: shippingAmount(current)
    });
  }

  const previousLines = lineMap(previous);
  const currentLines = lineMap(current);
  const lineIds = new Set([...previousLines.keys(), ...currentLines.keys()]);
  for (const lineId of [...lineIds].sort()) {
    const before = previousLines.get(lineId);
    const after = currentLines.get(lineId);
    if (!before || !after || before.status !== after.status || before.lineSubtotalMinor !== after.lineSubtotalMinor) {
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

  if (previous.totalMinor !== current.totalMinor) {
    changes.push({type: 'total_changed', previousTotalMinor: previous.totalMinor, currentTotalMinor: current.totalMinor});
  }

  return changes;
}
