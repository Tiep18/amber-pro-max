import {describe, expect, test} from 'vitest';
import {paypalFixtureIds} from '../../fixtures/payments/paypal-events';

describe('PayPal server client contract', () => {
  test('uses deterministic test fixture identifiers without live credentials', () => {
    expect(paypalFixtureIds.requestId).toContain(paypalFixtureIds.orderNumber);
    expect(JSON.stringify(paypalFixtureIds)).not.toMatch(/client_secret|access_token|live_|production|password/i);
  });

  test.todo('creates PayPal orders server-side from the authoritative local USD total');
  test.todo('sends a stable PayPal-Request-Id for create and capture retries');
  test.todo('does not accept browser-submitted amount, currency, merchant, or receiver facts');
  test.todo('captures through the server and maps provider timeout or retry outcomes to typed results');
  test.todo('rejects VietQR or VND orders before calling the PayPal provider');
  test.todo('does not perform network calls when a fixture transport is injected');
});
