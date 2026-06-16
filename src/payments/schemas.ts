import {z} from 'zod';

export const paymentProviderSchema = z.enum(['paypal', 'vietqr']);

export const paymentInternalStatusSchema = z.enum([
  'pending',
  'verifying',
  'paid',
  'failed',
  'cancelled',
  'rejected',
  'expired',
  'review_required',
  'partially_refunded',
  'refunded'
]);

export const customerPaymentStatusSchema = z.enum([
  'awaiting_payment',
  'verifying_payment',
  'paid',
  'payment_failed',
  'payment_cancelled',
  'expired',
  'partially_refunded',
  'refunded'
]);

export const fulfillmentGateStatusSchema = z.enum(['locked', 'eligible', 'review_required']);

export const paymentTransitionSourceSchema = z.enum([
  'paypal_webhook',
  'paypal_recheck',
  'vietqr_instruction',
  'vietqr_admin',
  'reservation_expiry_job',
  'system'
]);

export const paymentTransitionTargetSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'cancelled',
  'rejected',
  'expired',
  'review_required'
]);

export const paymentTransitionResultStatusSchema = z.enum([
  'applied',
  'duplicate',
  'stale',
  'review_required',
  'invalid',
  'error'
]);

export const sanitizedFactsSchema = z.record(z.string(), z.unknown()).refine(
  (value) => {
    const serialized = JSON.stringify(value).toLowerCase();
    return !/(client_secret|authorization|paypal_client_secret|webhook_id|signed_url|raw_payload|access_token|refresh_token)/.test(
      serialized
    );
  },
  {message: 'sanitized facts cannot contain raw secret material'}
);

export const paymentTransitionInputSchema = z
  .object({
    transitionKey: z.string().trim().min(8).max(200),
    source: paymentTransitionSourceSchema,
    targetStatus: paymentTransitionTargetSchema,
    paymentId: z.uuid().optional(),
    orderNumber: z.string().trim().min(1).max(80).optional(),
    providerEventId: z.string().trim().min(1).max(200).optional(),
    eventType: z.string().trim().min(1).max(120).optional(),
    verificationStatus: z.enum(['pending', 'verified', 'rejected', 'admin_verified', 'system']).optional(),
    payloadDigest: z.string().trim().min(32).max(128).optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    currencyCode: z.enum(['USD', 'VND']).optional(),
    releaseReason: z.string().trim().min(1).max(120).optional(),
    reviewReason: z.string().trim().min(1).max(120).optional(),
    bankReference: z.string().trim().min(1).max(120).optional(),
    receivedAmountMinor: z.number().int().nonnegative().optional(),
    receivedAt: z.iso.datetime().optional(),
    adminNote: z.string().trim().max(1000).optional(),
    sanitizedFacts: sanitizedFactsSchema.optional()
  })
  .refine((value) => Boolean(value.paymentId || value.orderNumber), {
    message: 'paymentId or orderNumber is required',
    path: ['orderNumber']
  })
  .refine(
    (value) => {
      if (value.source !== 'vietqr_admin' || value.targetStatus !== 'paid') {
        return true;
      }
      return Boolean(value.bankReference && value.receivedAmountMinor !== undefined && value.receivedAt);
    },
    {
      message: 'VietQR paid transitions require bank evidence',
      path: ['bankReference']
    }
  );

export const paymentTransitionResultSchema = z.object({
  status: paymentTransitionResultStatusSchema,
  code: z.string().optional(),
  transitionId: z.string().optional(),
  paymentStatus: paymentInternalStatusSchema.optional(),
  inventoryEffect: z.enum(['finalized', 'released', 'expired', 'none']).optional()
});
