import {describe, expect, test} from 'vitest';

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

  test.todo('maps PayPal return before verified webhook to verifying_payment, never paid');
  test.todo('maps verified completed payment to paid and opens only the paid gate');
  test.todo('maps failed, cancelled, rejected, and expired terminal states without same-order retry');
  test.todo('maps late completed provider money after local expiry to review_required with fulfillment locked');
  test.todo('renders partially_refunded and refunded as read-only visibility states');
});
