import type {CartIntentLine} from '@/cart/types';
import type {CartQuote} from './types';

export function quoteIntentLines(
  quote: Pick<CartQuote, 'lines' | 'quotedAt'>
): CartIntentLine[] {
  return quote.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.requestedQuantity,
    marketAtAdd: line.marketAtAdd,
    addedAt: quote.quotedAt,
    updatedAt: quote.quotedAt
  }));
}
