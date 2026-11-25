'use server';

import {suggestMarketFromCountry} from '@/catalog/market';
import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
import {getOrderPath} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import {createServerOrderAccess} from '@/order-access/server';
import {isKnownSubmitErrorCode} from './submit-error-copy';
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

export async function prepareGuestCheckoutRecoveryAction(
  input: unknown
): Promise<{status: 'ready'} | {status: 'invalid'; code: string}> {
  const inputRecord =
    input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const canonicalInput = canonicalCheckoutInput(inputRecord);
  const intent = canonicalInput ? guestRecoveryIntent(canonicalInput) : null;
  if (!intent) return {status: 'invalid', code: 'invalid_guest_recovery_intent'};
  return createServerOrderAccess().prepareGuestRecovery(intent);
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
  const inputRecord =
    input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
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
    // The checkout UI's error copy maps every known code to an actionable
    // message; a code outside that map would otherwise render silently as
    // the generic fallback, so record it as an operational fact instead.
    // runMonitoredAction already puts the result's own `code` into the
    // recorded facts (see errorCodeFromResult), so no factsFromResult is
    // needed here to surface which unmapped code was hit.
    shouldRecordResult: (result) =>
      result.status === 'error' || (result.status !== 'success' && !isKnownSubmitErrorCode(result.code)),
    operation: async () => {
      const orderAccess = createServerOrderAccess();
      const actor = await orderAccess.resolveCheckoutActor(guestRecoveryIntent(canonicalInput));
      if (actor.kind === 'guest_recovery_required') {
        return {status: 'invalid', code: 'guest_recovery_required'} as const;
      }

      const client = await createSupabaseServerClient();
      const result = await submitCheckout(
        {
          ...canonicalInput,
          userId: actor.kind === 'account' ? actor.userId : null,
          guestCartId: null,
          ...(actor.kind === 'guest' ? {guestRecovery: actor.guestRecovery} : {})
        } as never,
        client as never
      );
      if (result.status !== 'success') {
        return result;
      }

      if (actor.kind === 'guest') {
        await actor.openOrderSession({
          orderNumber: result.orderNumber,
          reservationExpiresAt: result.reservationExpiresAt
        });
      }

      try {
        await triggerTransactionalEmailOutboxNow({reason: 'checkout_submitted'});
      } catch {
        // The customer is already being redirected to the payment page; the
        // outbox worker will retry this on its own schedule.
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

export async function refreshGuestOrderAccessCookieAction(
  orderNumber: string
): Promise<{status: 'refreshed' | 'skipped'}> {
  return createServerOrderAccess().refreshGuestOrderSession(orderNumber);
}

export async function acknowledgeGuestCheckoutRecoveryAction(
  orderNumber: string
): Promise<{status: 'cleared' | 'kept'}> {
  return createServerOrderAccess().acknowledgeGuestRecovery(orderNumber);
}
