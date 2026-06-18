import {z} from 'zod';
import {quoteHasPhysicalLines, quoteShippingCountryCode, shippingAddressSchema} from './shipping-address';
import {quoteCartInputSchema} from './types';

export const checkoutPaymentIntentSchema = z.enum(['paypal_intent', 'vietqr_intent']);

export const submitCheckoutInputSchema = quoteCartInputSchema.extend({
  acceptedQuoteHash: z.string().trim().min(1).max(256),
  acceptedQuote: z.unknown(),
  idempotencyKey: z.string().trim().min(8).max(128),
  contactEmail: z.email().max(320),
  paymentIntent: checkoutPaymentIntentSchema,
  guestCartId: z.string().trim().max(128).optional().nullable(),
  exceptionGrantToken: z.string().trim().max(256).optional().nullable(),
  shippingAddress: shippingAddressSchema.optional().nullable()
}).superRefine((input, context) => {
  if (!quoteHasPhysicalLines(input.acceptedQuote)) {
    return;
  }

  if (!input.shippingAddress) {
    context.addIssue({
      code: 'custom',
      path: ['shippingAddress'],
      message: 'Physical checkout requires a full shipping address.'
    });
    return;
  }

  const quoteCountryCode = quoteShippingCountryCode(input.acceptedQuote);
  if (quoteCountryCode && input.shippingAddress.countryCode !== quoteCountryCode) {
    context.addIssue({
      code: 'custom',
      path: ['shippingAddress', 'countryCode'],
      message: 'Shipping address country must match the accepted quote.'
    });
  }
});

export type SubmitCheckoutInput = z.infer<typeof submitCheckoutInputSchema>;
