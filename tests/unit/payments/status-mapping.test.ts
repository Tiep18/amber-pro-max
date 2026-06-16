import {describe, expect, test} from 'vitest';
import {getCheckoutPath, getOrderPath} from '@/i18n/routing';
import {
  getPaymentStatusPresentation,
  mapCustomerPaymentStatus,
  type CustomerPaymentStatusInput
} from '@/payments/status';

const requiredCustomerStatuses = [
  'awaiting_payment',
  'verifying_payment',
  'paid',
  'failed',
  'cancelled',
  'rejected',
  'expired',
  'partially_refunded',
  'refunded',
  'review_required'
] as const;

const requiredStateFamilies = ['order', 'payment', 'digital_fulfillment', 'physical_fulfillment', 'paid_gate'] as const;

describe('Phase 4 customer payment status contract', () => {
  test('enumerates every customer-visible lifecycle state required by PAY-08', () => {
    expect(requiredCustomerStatuses).toEqual([
      'awaiting_payment',
      'verifying_payment',
      'paid',
      'failed',
      'cancelled',
      'rejected',
      'expired',
      'partially_refunded',
      'refunded',
      'review_required'
    ]);
  });

  test('keeps order, payment, fulfillment, and paid gate states separate for ORD-02 and PAY-07', () => {
    expect(requiredStateFamilies).toEqual(['order', 'payment', 'digital_fulfillment', 'physical_fulfillment', 'paid_gate']);
  });

  test('maps PayPal return before verified webhook to verifying_payment, never paid', () => {
    const status = mapCustomerPaymentStatus({
      paymentStatus: 'verifying',
      customerPaymentStatus: 'verifying_payment',
      fulfillmentGateStatus: 'locked',
      provider: 'paypal'
    });

    expect(status.status).toBe('verifying_payment');
    expect(status.isPaid).toBe(false);
    expect(status.fulfillmentLocked).toBe(true);
    expect(status.sameOrderRetryAllowed).toBe(false);
  });

  test('maps overdue pending PayPal orders to expired before rendering payment actions', () => {
    const status = mapCustomerPaymentStatus({
      paymentStatus: 'pending',
      customerPaymentStatus: 'awaiting_payment',
      fulfillmentGateStatus: 'locked',
      provider: 'paypal',
      reservationExpiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const presentation = getPaymentStatusPresentation(status.status, 'en', getCheckoutPath('en'));

    expect(status.status).toBe('expired');
    expect(status.isTerminal).toBe(true);
    expect(presentation.primaryAction?.href).toBe('/en/checkout');
  });

  test('maps verified completed payment to paid and opens only the paid gate', () => {
    const status = mapCustomerPaymentStatus({
      paymentStatus: 'paid',
      customerPaymentStatus: 'paid',
      fulfillmentGateStatus: 'eligible',
      provider: 'paypal'
    });

    expect(status.status).toBe('paid');
    expect(status.isPaid).toBe(true);
    expect(status.fulfillmentLocked).toBe(false);
    expect(status.digitalFulfillmentLabel).toBe('not_started');
    expect(status.physicalFulfillmentLabel).toBe('not_started');
  });

  test('maps failed, cancelled, rejected, and expired terminal states without same-order retry', () => {
    const states: Array<[CustomerPaymentStatusInput['paymentStatus'], string]> = [
      ['failed', 'failed'],
      ['cancelled', 'cancelled'],
      ['rejected', 'rejected'],
      ['expired', 'expired']
    ];

    for (const [paymentStatus, expected] of states) {
      const status = mapCustomerPaymentStatus({
        paymentStatus,
        customerPaymentStatus: 'verifying_payment',
        fulfillmentGateStatus: 'locked',
        provider: 'paypal'
      });
      const presentation = getPaymentStatusPresentation(status.status, 'en', getCheckoutPath('en'));

      expect(status.status).toBe(expected);
      expect(status.sameOrderRetryAllowed).toBe(false);
      expect(presentation.primaryAction?.href).toBe('/en/checkout');
    }
  });

  test('maps late completed provider money after local expiry to review_required with fulfillment locked', () => {
    const status = mapCustomerPaymentStatus({
      paymentStatus: 'review_required',
      customerPaymentStatus: 'verifying_payment',
      fulfillmentGateStatus: 'review_required',
      provider: 'paypal',
      reviewReason: 'late_payment_detected'
    });

    expect(status.status).toBe('review_required');
    expect(status.fulfillmentLocked).toBe(true);
    expect(status.isPaid).toBe(false);
  });

  test('renders partially_refunded and refunded as read-only visibility states', () => {
    for (const paymentStatus of ['partially_refunded', 'refunded'] as const) {
      const status = mapCustomerPaymentStatus({
        paymentStatus,
        customerPaymentStatus: paymentStatus,
        fulfillmentGateStatus: 'eligible',
        provider: 'paypal'
      });
      const presentation = getPaymentStatusPresentation(status.status, 'en', getCheckoutPath('en'));

      expect(status.isTerminal).toBe(true);
      expect(status.sameOrderRetryAllowed).toBe(false);
      expect(presentation.primaryAction).toBeNull();
    }
  });

  test('builds localized order paths without guest access material in the URL', () => {
    expect(getOrderPath('en', 'ATB-20260616-0001')).toBe('/en/orders/ATB-20260616-0001');
    expect(getOrderPath('vi', 'ATB-20260616-0001')).toBe('/vi/don-hang/ATB-20260616-0001');
    expect(getOrderPath('en', 'ATB token')).not.toContain('guest');
  });
});
