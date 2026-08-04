import {describe, expect, test} from 'vitest';
import {getOrderRecoveryAction} from '@/payments/order-recovery';

describe('terminal order recovery', () => {
  test.each(['failed', 'cancelled', 'rejected', 'expired'] as const)(
    '%s restores an eligible snapshot to cart for a fresh order',
    (status) => {
      expect(getOrderRecoveryAction({status, snapshotEligibility: 'eligible'})).toEqual({
        kind: 'restore_cart'
      });
    }
  );

  test.each(['failed', 'cancelled', 'rejected', 'expired'] as const)(
    '%s falls back to the catalog when recovery is unavailable',
    (status) => {
      expect(getOrderRecoveryAction({status, snapshotEligibility: 'ineligible'})).toEqual({
        kind: 'browse_catalog'
      });
    }
  );

  test.each(['awaiting_payment', 'verifying_payment', 'paid', 'partially_refunded', 'refunded', 'review_required'] as const)(
    '%s never mutates the cart through terminal recovery',
    (status) => {
      expect(getOrderRecoveryAction({status, snapshotEligibility: 'eligible'})).toBeNull();
    }
  );

  test('waits for local snapshot eligibility before choosing a primary action', () => {
    expect(getOrderRecoveryAction({status: 'expired', snapshotEligibility: 'unknown'})).toBeNull();
  });
});
