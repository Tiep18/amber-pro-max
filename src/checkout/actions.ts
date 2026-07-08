'use server';

import {z} from 'zod';
import {suggestMarketFromCountry} from '@/catalog/market';
import {getOrderPath} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';
import {setGuestOrderAccessCookieFromServer} from '@/payments/guest-access';
import {diffMaterialQuotes} from './market-revalidation';
import {quoteCartIntent} from './quote';
import {submitCheckout} from './submit-checkout';
import {quoteCartInputSchema, type CartQuote} from './types';

export type CheckoutQuoteActionState =
  | {status: 'success'; quote: CartQuote; materialChanges: ReturnType<typeof diffMaterialQuotes>}
  | {status: 'invalid'; code: 'invalid_checkout_quote'}
  | {status: 'error'; code: 'checkout_quote_failed'; errorId?: string};

export type SubmitCheckoutActionState =
  | {
      status: 'success';
      orderId: string;
      orderNumber: string;
      reservationExpiresAt: string;
      orderPath: string;
    }
  | {
      status: 'invalid' | 'stale' | 'conflict' | 'retryable' | 'error';
      code: string;
      errorId?: string;
    };

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
    const recorded = await recordOperationalFailure({
      area: 'checkout',
      severity: 'error',
      errorCode: 'checkout_quote_failed',
      summary: 'Checkout quote failed',
      facts: {
        market: parsed.data.market
      }
    });
    return {
      status: 'error',
      code: 'checkout_quote_failed',
      ...(recorded.status === 'recorded' ? {errorId: recorded.errorId} : {})
    };
  }
}

export async function submitCheckoutAction(input: unknown): Promise<SubmitCheckoutActionState> {
  try {
    const inputRecord = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
    const client = await createSupabaseServerClient();
    const {
      data: {user}
    } = await client.auth.getUser();
    const result = await submitCheckout(
      {
        ...inputRecord,
        userId: user?.id ?? null
      } as never,
      client as never
    );
    if (result.status !== 'success') {
      return result;
    }

    await setGuestOrderAccessCookieFromServer({
      orderNumber: result.orderNumber,
      rawToken: result.guestAccessToken,
      reservationExpiresAt: result.reservationExpiresAt
    });

    const locale = inputRecord.locale === 'en' ? 'en' : 'vi';
    return {
      status: 'success',
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      reservationExpiresAt: result.reservationExpiresAt,
      orderPath: getOrderPath(locale, result.orderNumber)
    };
  } catch {
    const inputRecord = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
    const recorded = await recordOperationalFailure({
      area: 'checkout',
      severity: 'error',
      errorCode: 'checkout_submit_failed',
      summary: 'Checkout submit failed',
      facts: {
        market: typeof inputRecord.market === 'string' ? inputRecord.market : undefined,
        paymentIntent: typeof inputRecord.paymentIntent === 'string' ? inputRecord.paymentIntent : undefined
      }
    });
    return {
      status: 'error',
      code: 'checkout_submit_failed',
      ...(recorded.status === 'recorded' ? {errorId: recorded.errorId} : {})
    };
  }
}
