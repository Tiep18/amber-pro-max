'use server';

import {z} from 'zod';
import {suggestMarketFromCountry} from '@/catalog/market';
import {getOrderPath} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
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

function attachOperationalErrorId<T extends object>(
  errorResult: T,
  recordResult: unknown
): T {
  return recordResult &&
    typeof recordResult === 'object' &&
    'status' in recordResult &&
    recordResult.status === 'recorded' &&
    'errorId' in recordResult &&
    typeof recordResult.errorId === 'string'
    ? ({...errorResult, errorId: recordResult.errorId} as T)
    : errorResult;
}

export async function refreshCheckoutQuoteAction(input: unknown): Promise<CheckoutQuoteActionState> {
  const parsed = checkoutQuoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_checkout_quote'};
  }

  return runMonitoredAction({
    area: 'checkout',
    action: 'checkout_quote',
    errorCode: 'checkout_quote_failed',
    summary: 'Checkout quote failed',
    facts: {
      market: parsed.data.market
    },
    errorResult: {status: 'error', code: 'checkout_quote_failed'} as const,
    decorateErrorResult: attachOperationalErrorId,
    operation: async () => {
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
    } as const;
    }
  });
}

export async function submitCheckoutAction(input: unknown): Promise<SubmitCheckoutActionState> {
  const inputRecord = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  return runMonitoredAction({
    area: 'checkout',
    action: 'checkout_submit',
    errorCode: 'checkout_submit_failed',
    summary: 'Checkout submit failed',
    facts: {
      ...(typeof inputRecord.market === 'string' ? {market: inputRecord.market} : {}),
      ...(typeof inputRecord.paymentIntent === 'string' ? {paymentIntent: inputRecord.paymentIntent} : {})
    },
    errorResult: {status: 'error', code: 'checkout_submit_failed'} as const,
    decorateErrorResult: attachOperationalErrorId,
    operation: async () => {
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
    } as const;
    }
  });
}
