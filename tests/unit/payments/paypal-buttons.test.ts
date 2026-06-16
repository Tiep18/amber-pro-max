import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';

const sourcePath = 'src/components/payments/paypal-buttons.tsx';

describe('PayPal customer button boundary', () => {
  test('uses only server-owned PayPal routes and guarded pending controls', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('/api/paypal/orders');
    expect(source).toContain('/capture');
    expect(source).toContain('aria-busy');
    expect(source).toContain('PAYPAL_RECHECK_COOLDOWN_MS');
    expect(source).toContain('PAYPAL_POLLING_WINDOW_MS');
    expect(source).not.toMatch(/PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID|PAYPAL_EXPECTED_MERCHANT_ID/);
    expect(source).not.toContain('localStorage');
  });
});
