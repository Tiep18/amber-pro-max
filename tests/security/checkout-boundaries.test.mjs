import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

  assert.doesNotMatch(
    source,
    /paypal\.Buttons|createOrder|capture|vietqr instruction|bank account/i
  );
  assert.doesNotMatch(
    source,
    /createSignedUrl|entitlement|digital entitlement|download link|download route|fulfillment record/i
  );
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
  assert.match(
    migration,
    /revoke all on function private\.checkout_commercial_quote_is_current\(jsonb, uuid\) from public, anon, authenticated/
  );
  assert.match(migration, /case when shipping_address ->> 'countryCode' = 'US'/);
  assert.match(migration, /on conflict \(order_line_id\) do nothing/);
  assert.match(migration, /Rebuild every persisted line snapshot from locked database rows/);
  assert.match(migration, /perform set_config\('app\.checkout_shipping_allocations'/);
  assert.doesNotMatch(migration, /_serverShippingAllocationMinor/);
  assert.doesNotMatch(migration, /highest[-_ ]first|package grouping/i);
});

test('checkout quotes use the same reservation-aware inventory authority as submit', () => {
  const quote = readFileSync('src/checkout/quote.ts', 'utf8');
  const migration = readFileSync(
    'supabase/migrations/20260727140000_checkout_quote_available_inventory.sql',
    'utf8'
  );

  assert.match(quote, /rpc\('get_checkout_inventory_availability'/);
  assert.match(quote, /product\.availableQuantity/);
  assert.match(migration, /public\.checkout_available_inventory\(ir\.id\)/);
  assert.match(migration, /cardinality\(coalesce\(p_product_ids/);
  assert.match(
    migration,
    /revoke all on function public\.get_checkout_inventory_availability\(uuid\[\]\)/
  );
});

test('guest retry recovery keeps raw credentials server-only and persists hashes only', () => {
  const migration = readFileSync(
    'supabase/migrations/20260714162000_secure_guest_checkout_retry_recovery.sql',
    'utf8'
  );
  const action = readFileSync('src/checkout/actions.ts', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const submit = readFileSync('src/checkout/submit-checkout.ts', 'utf8');

  assert.match(migration, /attempt_id_hash text primary key/);
  assert.match(migration, /for update/);
  assert.match(migration, /p_payload - 'guestRecovery'/);
  assert.match(migration, /'guest-attempt:' \|\| attempt_hash/);
  assert.match(
    migration,
    /revoke all on table private\.checkout_guest_attempt_claims from public, anon, authenticated/
  );
  assert.match(action, /prepareGuestCheckoutRecoveryFromServer/);
  assert.match(action, /setGuestOrderAccessCookieFromServer/);
  assert.match(client, /await prepareGuestCheckoutRecoveryAction/);
  // The invariant being protected is that guest recovery credentials live in
  // httpOnly cookies and never reach JS-readable storage. Credential names
  // stay banned outright, as does localStorage (long-lived and cross-tab —
  // nothing in checkout needs it).
  assert.doesNotMatch(client, /guestRecovery|attemptId|\bproof\b|localStorage/);

  // sessionStorage is confined to the reviewed idempotency and editable-draft
  // modules. Neither module may carry credentials or commerce authority.
  const idempotency = readFileSync('src/checkout/idempotency.ts', 'utf8');
  const editableDraft = readFileSync('src/checkout/editable-draft.ts', 'utf8');
  assert.doesNotMatch(idempotency, /guestRecovery|attemptId|\bproof\b|guestAccessToken|localStorage/);
  assert.match(idempotency, /sessionStorage/);
  assert.match(editableDraft, /atb_checkout_editable_draft_v1/);
  assert.match(editableDraft, /sessionStorage/);
  assert.doesNotMatch(
    editableDraft,
    /quoteHash|quoteId|subtotal|shippingMinor|discount|provider|payment|idempotency|guestRecovery|attemptId|\bproof\b|guestAccessToken|incident|saveConsent|saveAddress|localStorage/i
  );
  assert.doesNotMatch(editableDraft, /console\.(log|warn|error|info|debug)/);
  for (const match of client.matchAll(/sessionStorage/g)) {
    const context = client.slice(Math.max(0, match.index - 200), match.index + 200);
    assert.match(
      context,
      /checkoutSessionStorage/,
      'checkout may only reach sessionStorage through the reviewed idempotency helper'
    );
  }

  assert.doesNotMatch(submit, /guestAccessToken/);
});

test('discount allocation has separate zero and positive control flow', () => {
  const migration = readFileSync(
    'supabase/migrations/20260714170000_refine_checkout_discount_allocation_guard.sql',
    'utf8'
  );
  const zeroBranch = migration.indexOf('if expected_discount = 0 then');
  const positiveGuard = migration.indexOf('discount_rule.id is null or eligible_subtotal <= 0');
  const allocationCte = migration.indexOf('with candidates as', positiveGuard);

  assert.ok(zeroBranch >= 0);
  assert.ok(positiveGuard > zeroBranch);
  assert.ok(allocationCte > positiveGuard);
  assert.match(migration.slice(zeroBranch, positiveGuard), /discountAllocationMinor.*<> 0/s);
  assert.doesNotMatch(migration.slice(zeroBranch, positiveGuard), /with candidates as/);
});

test('destination authority and exact payment pairs are enforced before persistence', () => {
  const actions = readFileSync('src/checkout/actions.ts', 'utf8');
  const submit = readFileSync('src/checkout/submit-checkout.ts', 'utf8');
  const migration = readFileSync(
    'supabase/migrations/20260714150000_harden_checkout_submit_authority.sql',
    'utf8'
  );

  assert.match(
    actions,
    /destinationCountryCode\s*\?\s*suggestMarketFromCountry\(destinationCountryCode\)/
  );
  assert.match(
    submit,
    /quoteMarket === 'intl' && currencyCode === 'USD' && input\.paymentIntent === 'paypal_intent'/
  );
  assert.match(
    submit,
    /quoteMarket === 'vn' && currencyCode === 'VND' && input\.paymentIntent === 'vietqr_intent'/
  );
  assert.match(migration, /private\.checkout_commercial_quote_is_current/);
  assert.match(migration, /Rebuild every persisted line snapshot from locked database rows/);
  assert.match(migration, /insert into public\.checkout_order_shipping_allocations/);
  assert.match(migration, /on conflict \(order_line_id\) do nothing/);
});

test('checkout prefill uses authenticated server identity and deterministic destination defaults', () => {
  const route = readFileSync('src/app/[locale]/checkout/page.tsx', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const prefill = readFileSync('src/checkout/prefill.ts', 'utf8');

  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.match(route, /initialEmail=\{user\?\.email\?\.trim\(\) \?\? ''\}/);
  assert.doesNotMatch(client, /user_metadata|app_metadata|auth\.getUser/);
  assert.match(prefill, /savedDestination/);
  assert.match(prefill, /quotedDestination/);
  assert.match(prefill, /market === 'vn'/);
  assert.match(prefill, /countryCode: 'VN'/);
  assert.match(prefill, /source !== 'prefill'/);
});

test('checkout refreshes accepted commercial evidence immediately before submit', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const submitStart = client.indexOf('async function submit()');
  const preflight = client.indexOf('const refreshedLifecycle = await requestQuote(', submitStart);
  const recovery = client.indexOf('await prepareGuestCheckoutRecoveryAction(', submitStart);
  const persistence = client.indexOf('await submitCheckoutAction(submitInput)', submitStart);

  assert.ok(submitStart >= 0);
  assert.ok(preflight > submitStart);
  assert.ok(recovery > preflight);
  assert.ok(persistence > recovery);
  assert.match(
    client.slice(submitStart),
    /prepareGuestCheckoutRecoveryAction\(\{\s*acceptedQuote:\s*refreshedQuote,/
  );
  assert.match(client.slice(submitStart), /lines:\s*quoteIntentLines\(refreshedQuote\)/);
  assert.match(client.slice(submitStart), /discountCode: activeDiscountCode\(refreshedQuote\)/);
});

test('checkout removes only final ordered quantities after successful order creation', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const successBranch = client.indexOf("if (result.status === 'success')");
  const completion = client.indexOf('completeOrder(', successBranch);
  const navigation = client.indexOf('window.location.assign(result.orderPath)', successBranch);
  const priorSource = client.slice(0, successBranch);
  const branchSource = client.slice(successBranch, navigation);

  assert.ok(successBranch >= 0);
  assert.ok(completion > successBranch);
  assert.ok(navigation > completion);
  assert.doesNotMatch(priorSource, /completeOrder\(/);
  assert.match(branchSource, /line\.status === 'ready'/);
  assert.match(branchSource, /line\.status === 'quantity_capped'/);
  assert.match(branchSource, /quantity:\s*line\.quantity/);
  assert.doesNotMatch(branchSource, /quantity:\s*line\.requestedQuantity/);
});
