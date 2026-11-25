import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  describePayPalApprovalOutcome,
  resolveCaptureOutcome,
  type PayPalApprovalOutcome
} from '@/payments/paypal-capture-outcome';

const sourcePath = 'src/components/payments/paypal-buttons.tsx';
const recheckSourcePath = 'src/components/payments/payment-status-recheck.tsx';

describe('PayPal customer button boundary', () => {
  test('uses only server-owned PayPal routes and guarded pending controls', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('/api/paypal/orders');
    expect(source).toContain('/capture');
    expect(source).toContain('aria-busy');
    expect(source).toContain('useTransition');
    expect(source).not.toContain('setPending(false), 250');
    expect(source).not.toMatch(
      /PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID|PAYPAL_EXPECTED_MERCHANT_ID/
    );
    expect(source).not.toContain('localStorage');
  });

  test('delegates approval outcomes and double-charge guard decisions to paypal-capture-outcome', () => {
    const source = readFileSync(sourcePath, 'utf8');

    // The capture call must be able to reject without escaping onApprove, and
    // UI rendering must follow the outcome module's button-hiding decision.
    expect(source).toContain('try {');
    expect(source).toContain('resolveCaptureOutcome');
    expect(source).toContain('describePayPalApprovalOutcome');
    expect(source).toContain('hidden={hideButtons}');
  });
});

describe('PayPal approval outcome presentation and double-charge guard', () => {
  test.each([
    ['verifying', 'verifying', 'success', true, false],
    ['capture_failed', 'captureFailed', 'destructive', false, true],
    ['capture_unreachable', 'captureUnreachable', 'destructive', true, true],
    ['capture_uncertain', 'captureUncertain', 'warning', true, true],
    ['capture_reconciliation', 'captureReconciliation', 'warning', true, true],
    ['capture_review', 'captureReview', 'warning', true, false],
    ['cancelled', 'cancelled', 'warning', false, false],
    ['sdk_error', 'unavailable', 'destructive', false, false]
  ] satisfies Array<[PayPalApprovalOutcome, string, string, boolean, boolean]>)(
    '%s -> labelKey=%s alertVariant=%s hideButtons=%s allowStatusCheck=%s',
    (outcome, labelKey, alertVariant, hideButtons, allowStatusCheck) => {
      expect(describePayPalApprovalOutcome(outcome)).toEqual({
        outcome,
        labelKey,
        alertVariant,
        hideButtons,
        allowStatusCheck
      });
    }
  );
});

describe('PayPal capture outcome for the buyer', () => {
  test('a completed capture moves the buyer forward', () => {
    expect(resolveCaptureOutcome({ reachable: true, ok: true, status: 'paid' })).toBe('verifying');
  });

  test('an unreachable capture warns instead of claiming the order was not created', () => {
    // The buyer approved and we never learned the answer: paying again could
    // double-charge, so the copy this maps to says "check first".
    expect(resolveCaptureOutcome({ reachable: false })).toBe('capture_unreachable');
  });

  test('a late capture parked for review is not reported as a failure', () => {
    expect(resolveCaptureOutcome({ reachable: true, ok: false, status: 'review_required' })).toBe(
      'capture_review'
    );
  });

  test('a reconciliation mismatch is not described as a verified late payment', () => {
    expect(
      resolveCaptureOutcome({
        reachable: true,
        ok: false,
        status: 'reconciliation_required'
      })
    ).toBe('capture_reconciliation');
  });

  test('a capture that timed out against PayPal is uncertain, not failed', () => {
    // The route answers 202 `verifying` when the capture request itself timed
    // out: whether PayPal moved the money is genuinely unknown. Calling this
    // `capture_failed` would show copy promising "no money has been taken" and
    // invite the buyer to pay twice.
    expect(resolveCaptureOutcome({ reachable: true, ok: false, status: 'verifying' })).toBe(
      'capture_uncertain'
    );
  });

  test('every unexpected post-approval answer remains uncertain', () => {
    expect(resolveCaptureOutcome({ reachable: true, ok: false, status: 'not_found' })).toBe(
      'capture_uncertain'
    );
    // Even a malformed 200 is not proof that the provider did not capture.
    expect(resolveCaptureOutcome({ reachable: true, ok: true, status: undefined })).toBe(
      'capture_uncertain'
    );
  });
});

describe('provider-neutral payment status recheck', () => {
  test('exposes distinct timing profiles for PayPal and VietQR polling', () => {
    const source = readFileSync(recheckSourcePath, 'utf8');

    expect(source).toContain('PAYPAL_RECHECK_TIMING');
    expect(source).toContain('VIETQR_RECHECK_TIMING');
    expect(source).toContain('document.visibilityState');
    expect(source).toContain('aria-busy');
  });
});
