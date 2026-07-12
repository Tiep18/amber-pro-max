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

test('shipping quotes use the constrained v2 resolver and submit keeps browser shipping evidence advisory', () => {
  const quote = readFileSync('src/checkout/quote.ts', 'utf8');
  const migration = readFileSync(
    'supabase/migrations/20260712080300_checkout_shipping_quote_snapshot.sql',
    'utf8'
  );

  assert.match(quote, /rpc\('get_checkout_shipping_quote_v2'/);
  assert.doesNotMatch(quote, /get_checkout_shipping_rules/);
  assert.match(migration, /private\.resolve_checkout_shipping_allocations_v2/);
  assert.match(migration, /stale_shipping_quote/);
  assert.match(migration, /insert into public\.checkout_order_shipping_allocations/);
  assert.match(migration, /set search_path = public, pg_temp/);
});
