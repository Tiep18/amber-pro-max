import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

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
