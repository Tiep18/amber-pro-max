import { z } from 'zod';

const safeFulfillmentPayloadSchema = z.record(z.string(), z.unknown()).refine(
  (value) => {
    const serialized = JSON.stringify(value).toLowerCase();
    return !/(raw_token|download_token|signed_url|signedurl|storage_path|object_path|authorization|provider_payload|paypal_client_secret|webhook_id)/.test(
      serialized
    );
  },
  {
    message:
      'fulfillment payload cannot contain raw token, signed URL, storage object, or secret material'
  }
);

export const digitalEntitlementStatusSchema = z.enum(['active', 'revoked']);
export const digitalAccessTokenStatusSchema = z.enum(['active', 'revoked', 'expired']);
export const guestOrderAccessTokenPurposeSchema = z.enum(['reopen_order', 'claim_order']);
export const guestOrderAccessTokenStatusSchema = z.enum([
  'active',
  'consumed',
  'revoked',
  'expired'
]);

export const transactionalEmailEventTypeSchema = z.enum([
  'digital_access_granted',
  'digital_access_revoked',
  'digital_access_reissued',
  'physical_shipped',
  'guest_order_reopen',
  'guest_order_claim'
]);

export const transactionalEmailStatusSchema = z.enum([
  'pending',
  'sending',
  'sent',
  'failed',
  'cancelled'
]);
export const physicalFulfillmentStatusSchema = z.enum([
  'awaiting_fulfillment',
  'packing',
  'shipped',
  'delivered',
  'cancelled'
]);

export const revokeDigitalEntitlementInputSchema = z.object({
  entitlementId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(240)
});

export const reissueDigitalAccessTokenInputSchema = z.object({
  entitlementId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  newTokenHash: z.string().trim().min(32).max(128)
});

export const digitalEntitlementResultSchema = z.object({
  status: z.enum(['revoked', 'reissued', 'forbidden', 'not_found', 'stale', 'invalid']),
  version: z.number().int().positive().optional()
});

export const transactionalEmailOutboxPayloadSchema = safeFulfillmentPayloadSchema;

export const physicalFulfillmentUpdateSchema = z.object({
  orderId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: physicalFulfillmentStatusSchema,
  carrier: z.string().trim().max(120).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  trackingUrl: z.url().startsWith('https://').optional(),
  note: z.string().trim().max(240).optional()
});

export type DigitalEntitlementStatus = z.infer<typeof digitalEntitlementStatusSchema>;
export type DigitalAccessTokenStatus = z.infer<typeof digitalAccessTokenStatusSchema>;
export type GuestOrderAccessTokenPurpose = z.infer<typeof guestOrderAccessTokenPurposeSchema>;
export type TransactionalEmailEventType = z.infer<typeof transactionalEmailEventTypeSchema>;
export type PhysicalFulfillmentStatus = z.infer<typeof physicalFulfillmentStatusSchema>;
