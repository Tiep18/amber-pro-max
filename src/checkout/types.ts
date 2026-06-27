import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CurrencyCode } from '@/catalog/money';
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';
import type { Database } from '@/types/supabase';

export type CheckoutCatalogClient = SupabaseClient<Database>;

export const quoteCartInputSchema = z.object({
  locale: z.enum(['vi', 'en']),
  market: z.enum(['vn', 'intl']),
  lines: z.array(z.unknown()).max(100),
  destinationCountryCode: z.string().trim().max(2).optional().nullable(),
  discountCode: z.string().trim().max(40).optional().nullable(),
  priorAcceptedQuoteHash: z.string().max(256).optional().nullable()
});

export type QuoteCartActionInput = z.infer<typeof quoteCartInputSchema>;

export type QuoteCartInput = {
  locale: Locale;
  market: MarketCode;
  lines: unknown[];
  destinationCountryCode?: string | null;
  discountCode?: string | null;
  priorAcceptedQuoteHash?: string | null;
  userId?: string | null;
  client?: CheckoutCatalogClient;
};

export type CartFulfillmentType = 'digital' | 'physical';
export type CartQuoteLineStatus = 'ready' | 'unavailable' | 'invalid_variant' | 'quantity_capped';

export type CartQuoteLineChange =
  | { type: 'price_changed'; previousPriceMinor: number; currentPriceMinor: number }
  | { type: 'unavailable' }
  | { type: 'invalid_variant' }
  | { type: 'quantity_capped'; previousQuantity: number; currentQuantity: number };

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
  categoryIds: string[];
  collectionIds: string[];
  discountAllocationMinor: number;
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
  discount:
    | { status: 'not_applied'; amountMinor: 0; code?: null }
    | {
        status: 'applied';
        code: string;
        amountMinor: number;
        allocations: { lineId: string; amountMinor: number }[];
      }
    | { status: 'not_eligible'; code: string; amountMinor: 0; reason: string };
  shipping:
    | { status: 'not_calculated'; amountMinor: 0; countryCode?: null }
    | { status: 'no_shipping_required'; amountMinor: 0; countryCode: string | null }
    | {
        status: 'ready';
        amountMinor: number;
        countryCode: string;
        firstItemLineId: string;
        chargeableUnitCount: number;
      }
    | {
        status: 'unsupported_destination';
        amountMinor: null;
        countryCode: string;
        unsupportedLineIds: string[];
      };
  totalMinor: number;
  changes: CartQuoteLineChange[];
  hash: string;
  quotedAt: string;
};
