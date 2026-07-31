import type { CartQuote, CartQuoteLine } from '@/checkout/types';
import { cartLineKey, type CartIntentLine } from './types';

type SelectCartDisplayLinesInput = {
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  intentLines: CartIntentLine[];
  removedLineIds: ReadonlySet<string>;
  usePreviousQuoteFallback: boolean;
};

export function selectCartDisplayLines({
  quote,
  previousQuote,
  intentLines,
  removedLineIds,
  usePreviousQuoteFallback
}: SelectCartDisplayLinesInput): CartQuoteLine[] {
  const intendedLineKeys = new Set(intentLines.map((line) => cartLineKey(line)));
  const isStillIntended = (line: CartQuoteLine) =>
    intendedLineKeys.has(cartLineKey({ productId: line.productId, variantId: line.variantId }));
  const currentLineIds = new Set(quote?.lines.map((line) => line.lineId) ?? []);
  const previousLines = previousQuote?.lines ?? [];
  const displayLines =
    quote?.lines ??
    (usePreviousQuoteFallback ? previousLines.filter((line) => isStillIntended(line)) : []);
  const marketRemovedLines = quote
    ? previousLines.filter(
        (line) =>
          removedLineIds.has(line.lineId) &&
          !currentLineIds.has(line.lineId) &&
          isStillIntended(line)
      )
    : [];

  return [...displayLines, ...marketRemovedLines];
}
