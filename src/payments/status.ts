import type {Locale} from '@/i18n/routing';
import type {FulfillmentGateStatus, PaymentInternalStatus, PaymentProvider} from './types';

export type CustomerPaymentLifecycleStatus =
  | 'awaiting_payment'
  | 'verifying_payment'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'partially_refunded'
  | 'refunded'
  | 'review_required';

type ProjectionCustomerStatus =
  | CustomerPaymentLifecycleStatus
  | 'payment_failed'
  | 'payment_cancelled';

export type CustomerPaymentStatusInput = {
  paymentStatus?: PaymentInternalStatus | CustomerPaymentLifecycleStatus | null;
  customerPaymentStatus?: ProjectionCustomerStatus | null;
  fulfillmentGateStatus?: FulfillmentGateStatus | null;
  provider?: PaymentProvider | null;
  reviewReason?: string | null;
};

export type CustomerPaymentStatusModel = {
  status: CustomerPaymentLifecycleStatus;
  provider: PaymentProvider | null;
  isPaid: boolean;
  isTerminal: boolean;
  fulfillmentLocked: boolean;
  sameOrderRetryAllowed: boolean;
  digitalFulfillmentLabel: 'locked' | 'not_started';
  physicalFulfillmentLabel: 'locked' | 'not_started';
};

export type PaymentStatusPresentation = {
  status: CustomerPaymentLifecycleStatus;
  surface: 'default' | 'success' | 'warning' | 'destructive';
  headingKey: string;
  bodyKey: string;
  primaryAction: {href: `/${Locale}${string}`; labelKey: string} | null;
};

const TERMINAL_NO_RETRY = new Set<CustomerPaymentLifecycleStatus>([
  'failed',
  'cancelled',
  'rejected',
  'expired',
  'partially_refunded',
  'refunded'
]);

function normalizeProjectedStatus(status: ProjectionCustomerStatus | null | undefined): CustomerPaymentLifecycleStatus {
  if (status === 'payment_failed') {
    return 'failed';
  }
  if (status === 'payment_cancelled') {
    return 'cancelled';
  }
  if (
    status === 'awaiting_payment' ||
    status === 'verifying_payment' ||
    status === 'paid' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'rejected' ||
    status === 'expired' ||
    status === 'partially_refunded' ||
    status === 'refunded' ||
    status === 'review_required'
  ) {
    return status;
  }
  return 'verifying_payment';
}

export function mapCustomerPaymentStatus(input: CustomerPaymentStatusInput): CustomerPaymentStatusModel {
  let status = normalizeProjectedStatus(input.customerPaymentStatus);

  switch (input.paymentStatus) {
    case 'pending':
      status = 'awaiting_payment';
      break;
    case 'verifying':
      status = 'verifying_payment';
      break;
    case 'paid':
    case 'failed':
    case 'cancelled':
    case 'rejected':
    case 'expired':
    case 'partially_refunded':
    case 'refunded':
    case 'review_required':
      status = input.paymentStatus;
      break;
    default:
      break;
  }

  const isPaid = status === 'paid' || status === 'partially_refunded' || status === 'refunded';
  const fulfillmentLocked = !isPaid || input.fulfillmentGateStatus !== 'eligible';

  return {
    status,
    provider: input.provider ?? null,
    isPaid,
    isTerminal: isPaid || TERMINAL_NO_RETRY.has(status) || status === 'review_required',
    fulfillmentLocked,
    sameOrderRetryAllowed: false,
    digitalFulfillmentLabel: fulfillmentLocked ? 'locked' : 'not_started',
    physicalFulfillmentLabel: fulfillmentLocked ? 'locked' : 'not_started'
  };
}

export function getPaymentStatusPresentation(
  status: CustomerPaymentLifecycleStatus,
  _locale: Locale,
  freshCheckoutPath: `/${Locale}${string}`
): PaymentStatusPresentation {
  const surface =
    status === 'paid'
      ? 'success'
      : status === 'failed' || status === 'cancelled' || status === 'rejected' || status === 'expired'
        ? 'destructive'
        : status === 'refunded'
          ? 'default'
          : 'warning';

  const needsFreshCheckout = status === 'failed' || status === 'cancelled' || status === 'rejected' || status === 'expired';

  return {
    status,
    surface,
    headingKey: `orders.status.${status}.heading`,
    bodyKey: `orders.status.${status}.body`,
    primaryAction: needsFreshCheckout ? {href: freshCheckoutPath, labelKey: 'orders.actions.newCheckout'} : null
  };
}
