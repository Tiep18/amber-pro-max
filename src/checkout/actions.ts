'use server';

import {suggestMarketFromCountry} from '@/catalog/market';
import {getOrderPath} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import {
  acknowledgeGuestCheckoutRecoveryFromServer,
  getGuestCheckoutRecoveryFromServer,
  getGuestOrderAccessHashFromServer,
  hashGuestOrderAccessToken,
  prepareGuestCheckoutRecoveryFromServer,
  setGuestOrderAccessCookieFromServer
} from '@/payments/guest-access';
import {getAuthorizedOrderPayment} from '@/payments/queries';
import type {CheckoutPaymentIntent} from './schemas';
import {checkoutPaymentIntentForQuote} from './payment-method';
import {quoteCartIntent} from './quote';
import {submitCheckout} from './submit-checkout';
import {quoteCartInputSchema, type CartQuote} from './types';

export type CheckoutQuoteActionState =
  | {status: 'success'; quote: CartQuote; materialChanges: []}
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

function guestRecoveryIntent(input: Record<string, unknown>) {
  const quoteHash = typeof input.acceptedQuoteHash === 'string' ? input.acceptedQuoteHash.trim() : '';
  const email = typeof input.contactEmail === 'string' ? input.contactEmail.trim().toLowerCase() : '';
  const paymentIntent = typeof input.paymentIntent === 'string' ? input.paymentIntent : '';
  if (!quoteHash || !email || !paymentIntent) return null;
  return JSON.stringify({quoteHash, email, paymentIntent});
}

type CanonicalCheckoutInput = Record<string, unknown> & {
  paymentIntent: CheckoutPaymentIntent;
};

function canonicalCheckoutInput(input: Record<string, unknown>): CanonicalCheckoutInput | null {
  const paymentIntent = checkoutPaymentIntentForQuote(input.acceptedQuote);
  return paymentIntent ? {...input, paymentIntent} : null;
}

export async function prepareGuestCheckoutRecoveryAction(input: unknown): Promise<{status: 'ready'} | {status: 'invalid'; code: string}> {
  const inputRecord = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const canonicalInput = canonicalCheckoutInput(inputRecord);
  const intent = canonicalInput ? guestRecoveryIntent(canonicalInput) : null;
  if (!intent) return {status: 'invalid', code: 'invalid_guest_recovery_intent'};
  const client = await createSupabaseServerClient();
  const {data: {user}} = await client.auth.getUser();
  if (user) return {status: 'ready'};
  return prepareGuestCheckoutRecoveryFromServer(intent);
}

export async function refreshCheckoutQuoteAction(input: unknown): Promise<CheckoutQuoteActionState> {
  const parsed = quoteCartInputSchema.strict().safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_checkout_quote'};
  }

  const destinationCountryCode = parsed.data.destinationCountryCode?.trim().toUpperCase() || null;
  const destinationRegionCode = parsed.data.destinationRegionCode?.trim().toUpperCase() || null;
  const market = destinationCountryCode ? suggestMarketFromCountry(destinationCountryCode) : parsed.data.market;

  return runMonitoredAction({
    area: 'checkout',
    action: 'checkout_quote',
    errorCode: 'checkout_quote_failed',
    summary: 'Checkout quote failed',
    facts: {
      market,
      ...(destinationCountryCode ? {destinationCountryCode} : {}),
      ...(destinationRegionCode ? {destinationRegionCode} : {})
    },
    errorResult: {status: 'error', code: 'checkout_quote_failed'} as const,
    operation: async () => {
      const client = await createSupabaseServerClient();
      const {
        data: {user}
      } = await client.auth.getUser();
      const quote = await quoteCartIntent({
        ...parsed.data,
        market,
        destinationCountryCode,
        destinationRegionCode,
        shippingQuoteVersion: 2,
        userId: user?.id ?? null,
        client
      });
      return {status: 'success', quote, materialChanges: []} as const;
    }
  });
}

export async function submitCheckoutAction(input: unknown): Promise<SubmitCheckoutActionState> {
  const inputRecord = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const canonicalInput = canonicalCheckoutInput(inputRecord);
  if (!canonicalInput) {
    return {status: 'invalid', code: 'invalid_payment_method_for_market'};
  }
  return runMonitoredAction({
    area: 'checkout',
    action: 'checkout_submit',
    errorCode: 'checkout_submit_failed',
    summary: 'Checkout submit failed',
    facts: {
      ...(typeof canonicalInput.market === 'string' ? {market: canonicalInput.market} : {}),
      paymentIntent: canonicalInput.paymentIntent
    },
    errorResult: {status: 'error', code: 'checkout_submit_failed'} as const,
    operation: async () => {
      const client = await createSupabaseServerClient();
      const {
        data: {user}
      } = await client.auth.getUser();
      const intent = guestRecoveryIntent(canonicalInput);
      const recovery = user || !intent ? null : await getGuestCheckoutRecoveryFromServer(intent);
      if (!user && !recovery) {
        return {status: 'invalid', code: 'guest_recovery_required'} as const;
      }
      const result = await submitCheckout(
        {
          ...canonicalInput,
          userId: user?.id ?? null,
          guestCartId: null,
          ...(recovery ? {guestRecovery: {attemptId: recovery.attemptId, proof: recovery.proof}} : {})
        } as never,
        client as never
      );
      if (result.status !== 'success') {
        return result;
      }

      if (recovery) {
        await setGuestOrderAccessCookieFromServer({
          orderNumber: result.orderNumber,
          rawToken: recovery.proof,
          reservationExpiresAt: result.reservationExpiresAt
        });
      }

      const locale = canonicalInput.locale === 'en' ? 'en' : 'vi';
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

export async function acknowledgeGuestCheckoutRecoveryAction(orderNumber: string): Promise<{status: 'cleared' | 'kept'}> {
  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  if (!normalizedOrderNumber) return {status: 'kept'};
  const recovery = await getGuestCheckoutRecoveryFromServer();
  if (!recovery) return {status: 'kept'};
  const guestSecretHash = await getGuestOrderAccessHashFromServer(normalizedOrderNumber);
  if (guestSecretHash !== hashGuestOrderAccessToken(recovery.proof)) return {status: 'kept'};
  const client = await createSupabaseServerClient();
  const authorized = await getAuthorizedOrderPayment({orderNumber: normalizedOrderNumber, guestSecretHash, client: client as never});
  if (authorized.status !== 'found') return {status: 'kept'};
  return acknowledgeGuestCheckoutRecoveryFromServer(normalizedOrderNumber, recovery);
}
