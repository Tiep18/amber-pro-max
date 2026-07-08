'use server';

import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getRequestMarket} from '@/catalog/page-context';
import {quoteCartIntent} from '@/checkout/quote';
import {quoteCartInputSchema, type CartQuote} from '@/checkout/types';
import {runMonitoredAction} from '@/operations/monitoring';

export type CartQuoteActionState =
  | {status: 'success'; quote: CartQuote}
  | {status: 'invalid'; code: 'invalid_cart_intent'}
  | {status: 'error'; code: 'quote_failed'};

export async function refreshCartQuoteAction(input: unknown): Promise<CartQuoteActionState> {
  const parsed = quoteCartInputSchema.omit({market: true}).safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_cart_intent'};
  }

  return runMonitoredAction({
    area: 'checkout',
    action: 'cart_quote_refresh',
    errorCode: 'cart.quote_refresh_failed',
    summary: 'Cart quote refresh failed',
    facts: {
      market: parsed.data.locale === 'vi' ? 'vn' : 'intl'
    },
    errorResult: {status: 'error', code: 'quote_failed'} as const,
    operation: async () => {
      const [client, market] = await Promise.all([createSupabaseServerClient(), getRequestMarket()]);
      const quote = await quoteCartIntent({...parsed.data, market, client});
      return {status: 'success', quote} as const;
    }
  });
}
