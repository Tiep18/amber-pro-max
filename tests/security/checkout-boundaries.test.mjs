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

test('checkout submit revalidates commercial facts privately before persistence', () => {
  const migration = readFileSync(
    'supabase/migrations/20260714150000_harden_checkout_submit_authority.sql',
    'utf8'
  );

  assert.match(migration, /private\.checkout_commercial_quote_is_current/);
  assert.match(migration, /stale_commercial_quote/);
  assert.match(migration, /checkout_orders_authoritative_arithmetic_check/);
  assert.match(migration, /revoke all on function private\.checkout_commercial_quote_is_current\(jsonb, uuid\) from public, anon, authenticated/);
  assert.match(migration, /case when shipping_address ->> 'countryCode' = 'US'/);
  assert.match(migration, /on conflict \(order_line_id\) do nothing/);
  assert.match(migration, /Rebuild every persisted line snapshot from locked database rows/);
  assert.match(migration, /perform set_config\('app\.checkout_shipping_allocations'/);
  assert.doesNotMatch(migration, /_serverShippingAllocationMinor/);
  assert.doesNotMatch(migration, /highest[-_ ]first|package grouping/i);
});

test('guest retry recovery keeps raw credentials server-only and persists hashes only', () => {
  const migration = readFileSync('supabase/migrations/20260714162000_secure_guest_checkout_retry_recovery.sql', 'utf8');
  const action = readFileSync('src/checkout/actions.ts', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const submit = readFileSync('src/checkout/submit-checkout.ts', 'utf8');

  assert.match(migration, /attempt_id_hash text primary key/);
  assert.match(migration, /for update/);
  assert.match(migration, /p_payload - 'guestRecovery'/);
  assert.match(migration, /'guest-attempt:' \|\| attempt_hash/);
  assert.match(migration, /revoke all on table private\.checkout_guest_attempt_claims from public, anon, authenticated/);
  assert.match(action, /prepareGuestCheckoutRecoveryFromServer/);
  assert.match(action, /setGuestOrderAccessCookieFromServer/);
  assert.match(client, /await prepareGuestCheckoutRecoveryAction/);
  assert.doesNotMatch(client, /guestRecovery|attemptId|\bproof\b|localStorage|sessionStorage/);
  assert.doesNotMatch(submit, /guestAccessToken/);
});
