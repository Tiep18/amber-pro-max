import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const checkoutFiles = [
  'src/components/checkout/checkout-page.tsx',
  'src/components/checkout/approved-exception-page.tsx',
  'src/components/checkout/exception-request-form.tsx',
  'src/checkout/exceptions.ts',
  'src/checkout/submit-checkout.ts'
];

test('checkout phase does not expose payment capture fulfillment or raw grant secrets', () => {
  const source = checkoutFiles
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /paypal\.Buttons|createOrder|capture|vietqr instruction|bank account/i);
  assert.doesNotMatch(source, /createSignedUrl|entitlement|digital entitlement|download link|download route|fulfillment record/i);
  assert.doesNotMatch(source, /console\.(log|warn|error)\([^)]*token/i);
});
