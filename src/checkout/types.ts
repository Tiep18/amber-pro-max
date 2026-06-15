import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {CurrencyCode} from '@/catalog/money';
import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import type {Database} from '@/types/supabase';
import {cartIntentLineSchema} from '@/cart/types';

export type CheckoutCatalogClient = SupabaseClient<Database>;

export const quoteCartInputSchema = z.object({
  locale: z.enum(['vi', 'en']),
  market: z.enum(['vn', 'intl']),
  lines: z.array(z.unknown()).max(100),
  priorAcceptedQuoteHash: z.string().max(256).optional().nullable()
});

export type QuoteCartActionInput = z.infer<typeof quoteCartInputSchema>;

export type QuoteCartInput = {
  locale: Locale;
  market: MarketCode;
  lines: unknown[];
  priorAcceptedQuoteHash?: string | null;
  client?: CheckoutCatalogClient;
};

export type CartFulfillmentType = 'digital' | 'physical';
export type CartQuoteLineStatus = 'ready' | 'unavailable' | 'invalid_variant' | 'quantity_capped';

export type CartQuoteLineChange =
  | {type: 'price_changed'; previousPriceMinor: number; currentPriceMinor: number}
  | {type: 'unavailable'}
  | {type: 'invalid_variant'}
  | {type: 'quantity_capped'; previousQuantity: number; currentQuantity: number};

export type CartQuoteLine = {
  lineId: string;
  productId: string;
  variantId: string | null;
  slug: string | null;
  title: string;
  fulfillmentType: CartFulfillmentType;
  status: CartQuoteLineStatus;
  quantity: number;
  requestedQuantity: number;
  marketAtAdd: MarketCode;
  currencyCode: CurrencyCode;
  unitPriceMinor: number;
  lineSubtotalMinor: number;
  excludedSubtotalMinor: number;
  variantLabel: string | null;
  imageUrl: string | null;
  change: CartQuoteLineChange | null;
};

export type CartQuote = {
  status: 'empty' | 'ready' | 'blocked';
  locale: Locale;
  market: MarketCode;
  currencyCode: CurrencyCode | null;
  lines: CartQuoteLine[];
  subtotalMinor: number;
  excludedSubtotalMinor: number;
  shipping: {status: 'not_calculated'; amountMinor: 0};
  totalMinor: number;
  changes: CartQuoteLineChange[];
  hash: string;
  quotedAt: string;
};
