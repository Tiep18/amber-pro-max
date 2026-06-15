'use server';

import {z} from 'zod';
import {suggestMarketFromCountry} from '@/catalog/market';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {diffMaterialQuotes} from './market-revalidation';
import {quoteCartIntent} from './quote';
import {submitCheckout, type SubmitCheckoutResult} from './submit-checkout';
import {quoteCartInputSchema, type CartQuote} from './types';

export type CheckoutQuoteActionState =
  | {status: 'success'; quote: CartQuote; materialChanges: ReturnType<typeof diffMaterialQuotes>}
  | {status: 'invalid'; code: 'invalid_checkout_quote'}
  | {status: 'error'; code: 'checkout_quote_failed'};

export type SubmitCheckoutActionState = SubmitCheckoutResult;

const checkoutQuoteInputSchema = quoteCartInputSchema.extend({
  acceptedQuote: z.custom<CartQuote>().optional().nullable()
});

export async function refreshCheckoutQuoteAction(input: unknown): Promise<CheckoutQuoteActionState> {
  const parsed = checkoutQuoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_checkout_quote'};
  }

  try {
    const client = await createSupabaseServerClient();
    const {
      data: {user}
    } = await client.auth.getUser();
    const destinationCountryCode = parsed.data.destinationCountryCode?.trim().toUpperCase() || null;
    const market = destinationCountryCode ? suggestMarketFromCountry(destinationCountryCode) : parsed.data.market;
    const quote = await quoteCartIntent({...parsed.data, market, destinationCountryCode, userId: user?.id ?? null, client});
    return {
      status: 'success',
      quote,
      materialChanges: parsed.data.acceptedQuote ? diffMaterialQuotes(parsed.data.acceptedQuote, quote) : []
    };
  } catch {
    return {status: 'error', code: 'checkout_quote_failed'};
  }
}

export async function submitCheckoutAction(input: unknown): Promise<SubmitCheckoutActionState> {
  try {
    const client = await createSupabaseServerClient();
    const {
      data: {user}
    } = await client.auth.getUser();
    const result = await submitCheckout(
      {
        ...(input as Record<string, unknown>),
        userId: user?.id ?? null
      } as never,
      client as never
    );
    return result;
  } catch {
    return {status: 'error', code: 'checkout_submit_failed'};
  }
}
