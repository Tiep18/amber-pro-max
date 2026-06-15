import {z} from 'zod';
import {quoteCartInputSchema} from './types';

export const checkoutPaymentIntentSchema = z.enum(['paypal_intent', 'vietqr_intent']);

export const submitCheckoutInputSchema = quoteCartInputSchema.extend({
  acceptedQuoteHash: z.string().trim().min(1).max(256),
  acceptedQuote: z.unknown(),
  idempotencyKey: z.string().trim().min(8).max(128),
  contactEmail: z.email().max(320),
  paymentIntent: checkoutPaymentIntentSchema,
  guestCartId: z.string().trim().max(128).optional().nullable(),
  exceptionGrantToken: z.string().trim().max(256).optional().nullable()
});

export type SubmitCheckoutInput = z.infer<typeof submitCheckoutInputSchema>;
