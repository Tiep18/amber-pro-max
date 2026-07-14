import {z} from 'zod';
import {quoteHasPhysicalLines, quoteShippingCountryCode, shippingAddressSchema} from './shipping-address';
import {quoteCartInputSchema} from './types';

export const checkoutPaymentIntentSchema = z.enum(['paypal_intent', 'vietqr_intent']);

const guestRecoverySchema = z.object({
  attemptId: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  proof: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
}).strict();

export const submitCheckoutInputSchema = quoteCartInputSchema.extend({
  acceptedQuoteHash: z.string().trim().min(1).max(256),
  acceptedQuote: z.unknown(),
  idempotencyKey: z.string().trim().min(8).max(128),
  contactEmail: z.email().max(320),
  paymentIntent: checkoutPaymentIntentSchema,
  guestCartId: z.string().trim().max(128).optional().nullable(),
  guestRecovery: guestRecoverySchema.optional(),
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

  if (input.shippingAddress.countryCode === 'US') {
    if (!/^[A-Z]{2}$/.test(input.shippingAddress.region ?? '')) {
      context.addIssue({
        code: 'custom',
        path: ['shippingAddress', 'region'],
        message: 'US physical checkout requires a two-letter state or territory code.'
      });
    }
    if (!input.shippingAddress.postalCode?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['shippingAddress', 'postalCode'],
        message: 'US physical checkout requires a postal code.'
      });
    }
  }
});

export type SubmitCheckoutInput = z.infer<typeof submitCheckoutInputSchema>;
