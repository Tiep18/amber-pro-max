import type {z} from 'zod';
import type {
  customerPaymentStatusSchema,
  fulfillmentGateStatusSchema,
  paymentProviderSchema,
  paymentTransitionInputSchema,
  paymentTransitionResultSchema,
  paymentTransitionSourceSchema,
  paymentTransitionTargetSchema,
  paymentInternalStatusSchema
} from './schemas';

export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type PaymentInternalStatus = z.infer<typeof paymentInternalStatusSchema>;
export type CustomerPaymentStatus = z.infer<typeof customerPaymentStatusSchema>;
export type FulfillmentGateStatus = z.infer<typeof fulfillmentGateStatusSchema>;
export type PaymentTransitionSource = z.infer<typeof paymentTransitionSourceSchema>;
export type PaymentTransitionTarget = z.infer<typeof paymentTransitionTargetSchema>;
export type PaymentTransitionInput = z.input<typeof paymentTransitionInputSchema>;
export type ParsedPaymentTransitionInput = z.output<typeof paymentTransitionInputSchema>;
export type PaymentTransitionResult = z.infer<typeof paymentTransitionResultSchema>;

export type PaymentStateFamily = {
  orderStatus:
    | 'pending_payment'
    | 'verifying_payment'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'rejected'
    | 'expired'
    | 'review_required'
    | 'partially_refunded'
    | 'refunded';
  paymentStatus: PaymentInternalStatus;
  customerPaymentStatus: CustomerPaymentStatus;
  paidGateStatus: FulfillmentGateStatus;
  digitalFulfillmentStatus: 'blocked' | 'eligible' | 'not_required';
  physicalFulfillmentStatus: 'blocked' | 'awaiting_fulfillment' | 'not_required';
};

export type ProviderPaymentFacts = {
  provider: PaymentProvider;
  providerEventId?: string;
  providerOrderId?: string;
  providerCaptureId?: string;
  merchantId?: string;
  amountMinor?: number;
  currencyCode?: 'USD' | 'VND';
  payloadDigest?: string;
};

export type VietQrPaymentEvidence = {
  bankReference: string;
  receivedAmountMinor: number;
  receivedAt: string;
  adminNote?: string;
};
