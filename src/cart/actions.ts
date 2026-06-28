'use server';

import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getRequestMarket} from '@/catalog/page-context';
import {quoteCartIntent} from '@/checkout/quote';
import {quoteCartInputSchema, type CartQuote} from '@/checkout/types';

export type CartQuoteActionState =
  | {status: 'success'; quote: CartQuote}
  | {status: 'invalid'; code: 'invalid_cart_intent'}
  | {status: 'error'; code: 'quote_failed'};

export async function refreshCartQuoteAction(input: unknown): Promise<CartQuoteActionState> {
  const parsed = quoteCartInputSchema.omit({market: true}).safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_cart_intent'};
  }

  try {
    const [client, market] = await Promise.all([createSupabaseServerClient(), getRequestMarket()]);
    const quote = await quoteCartIntent({...parsed.data, market, client});
    return {status: 'success', quote};
  } catch {
    return {status: 'error', code: 'quote_failed'};
  }
}
