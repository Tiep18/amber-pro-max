import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const checkoutFiles = [
  'src/components/checkout/checkout-page.tsx',
  'src/checkout/checkout-session.ts',
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
  const orderAccess = readFileSync('src/order-access/order-access.ts', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const submit = readFileSync('src/checkout/submit-checkout.ts', 'utf8');

  assert.match(migration, /attempt_id_hash text primary key/);
  assert.match(migration, /for update/);
  assert.match(migration, /p_payload - 'guestRecovery'/);
  assert.match(migration, /'guest-attempt:' \|\| attempt_hash/);
  assert.match(
    migration,
    /revoke all on table private\.checkout_guest_attempt_claims from public, anon, authenticated/
  );
  assert.match(action, /createServerOrderAccess/);
  assert.match(action, /prepareGuestRecovery/);
  assert.match(action, /resolveCheckoutActor/);
  assert.match(action, /openOrderSession/);
  assert.match(orderAccess, /httpOnly:\s*true/);
  assert.match(orderAccess, /timingSafeEqual/);
  assert.doesNotMatch(orderAccess, /localStorage|sessionStorage/);
  assert.match(client, /prepareGuestRecovery:\s*prepareGuestCheckoutRecoveryAction/);
  assert.match(session, /await ports\.prepareGuestRecovery\(/);
  // The invariant being protected is that guest recovery credentials live in
  // httpOnly cookies and never reach JS-readable storage. Credential names
  // stay banned outright, as does localStorage (long-lived and cross-tab —
  // nothing in checkout needs it).
  assert.doesNotMatch(client, /guestRecovery|attemptId|\bproof\b|localStorage/);
  assert.doesNotMatch(session, /guestRecovery|attemptId|\bproof\b|localStorage/);

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
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');

  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.match(route, /initialEmail=\{user\?\.email\?\.trim\(\) \?\? ''\}/);
  assert.doesNotMatch(client, /user_metadata|app_metadata|auth\.getUser/);
  assert.match(session, /savedDestination/);
  assert.match(session, /quotedDestination/);
  assert.match(session, /market === 'vn'/);
  assert.match(session, /countryCode: 'VN'/);
  assert.match(session, /source === 'prefill'/);
});

test('checkout draft uses a server-only HMAC account scope without exposing raw identity', () => {
  const page = readFileSync('src/app/[locale]/checkout/page.tsx', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const draft = readFileSync('src/checkout/editable-draft.ts', 'utf8');
  const scopePath = 'src/checkout/editable-draft-scope.server.ts';
  const serverEnv = readFileSync('src/lib/env/server.ts', 'utf8');
  assert.ok(existsSync(scopePath), 'authenticated draft scope must live in a server-only module');
  const scope = readFileSync(scopePath, 'utf8');

  assert.match(page, /buildAuthenticatedCheckoutDraftScope\(user\.id\)/);
  assert.match(page, /CHECKOUT_GUEST_DRAFT_SCOPE/);
  assert.match(page, /draftScope=\{draftScope\}/);
  assert.match(client, /draftScope,/);
  assert.match(session, /readEditableDraft\(\{[\s\S]*scope:\s*config\.draftScope/);
  assert.match(session, /writeEditableDraft\(\{[\s\S]*scope:\s*config\.draftScope/);
  assert.match(draft, /scope_mismatch/);
  assert.match(draft, /atb_checkout_editable_draft_v2/);
  assert.doesNotMatch(draft, /buildCheckoutDraftScope|userId/);
  assert.match(scope, /^import 'server-only';/);
  assert.match(scope, /createHmac\(['"]sha256['"],\s*secret\)/);
  assert.match(scope, /checkout-editable-draft:account-scope:v2:/);
  assert.match(scope, /requirePrivilegedServerKey\(source\)/);
  assert.doesNotMatch(scope, /SUPABASE_SECRET|SECRET_KEY|SERVICE_ROLE|sb_secret_/i);
  assert.match(
    serverEnv,
    /function requirePrivilegedServerKey\([\s\S]*SUPABASE_SECRET_KEY[\s\S]*missing_supabase_secret_key/
  );
  assert.doesNotMatch(client, /draftScope=.*(?:email|userId|user\.id)/);
});

test('generic storefront context invalidation never pre-clears an editable checkout draft', () => {
  const context = readFileSync('src/components/storefront-context.tsx', 'utf8');

  assert.doesNotMatch(context, /clearBrowserEditableDraft/);
  assert.match(context, /window\.dispatchEvent\(new CustomEvent\(STOREFRONT_CONTEXT_CHANGED\)\)/);
  assert.match(context, /notifyStorefrontContextInvalidated\(\)/);
});

test('checkout completion icons use the active-locale accessible name', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  assert.doesNotMatch(client, /aria-label=['"]Complete['"]/);
  assert.equal(client.match(/aria-label=\{t\.complete\}/g)?.length, 2);
});

test('checkout refreshes accepted commercial evidence immediately before submit', () => {
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const submitStart = session.indexOf('async submit()');
  const placeStart = session.indexOf('async function placeOrderForQuote(');
  const preflight = session.indexOf('await requestQuote(', submitStart);
  const recovery = session.indexOf('await ports.prepareGuestRecovery(', placeStart);
  const persistence = session.indexOf('await ports.submitOrder(submitInput)', placeStart);

  assert.ok(submitStart >= 0);
  assert.ok(placeStart >= 0);
  assert.ok(preflight > submitStart);
  assert.ok(recovery > placeStart);
  assert.ok(persistence > recovery);
  assert.match(
    session.slice(placeStart),
    /ports\.prepareGuestRecovery\(\{\s*acceptedQuote:\s*refreshedQuote,/
  );
  assert.match(session.slice(placeStart), /lines:\s*quoteIntentLines\(refreshedQuote\)/);
  assert.match(session.slice(placeStart), /discountCode:\s*activeDiscountCode\(refreshedQuote\)/);
});

test('checkout locks one editable region through truthful submit stages and navigates only after success', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const submitStart = session.indexOf('async submit()');
  const placeStart = session.indexOf('async function placeOrderForQuote(');
  const successBranch = session.indexOf("if (result.status === 'success')", placeStart);
  const successSource = session.slice(successBranch);

  assert.ok(submitStart >= 0);
  assert.ok(placeStart >= 0);
  assert.ok(successBranch > placeStart);
  assert.match(session, /export type SubmitStage = 'idle' \| 'checking-total' \| 'creating-order'/);
  assert.match(session.slice(submitStart), /if \(submitInFlight \|\| disposed\)/);
  assert.match(session.slice(submitStart), /submitInFlight = true;/);
  assert.match(session.slice(submitStart), /submitStage = 'checking-total';/);
  assert.match(session.slice(placeStart, successBranch), /submitStage = 'creating-order';/);
  assert.match(client, /aria-busy=\{snapshot\.submitStage !== 'idle'\}/);
  assert.match(client, /disabled=\{snapshot\.controlsDisabled\}/);
  assert.match(successSource, /clearEditableDraft\(storage\)/);
  assert.match(successSource, /clearStoredIdempotency\(storage\)/);
  assert.match(successSource, /ports\.onOrderCreated\(/);
  assert.match(client, /commitPlacedOrder\(\{\s*orderNumber,\s*completedLines\s*\}\)/);
  assert.match(client, /router\.push\(orderPath\)/);
  assert.doesNotMatch(client, /window\.location\.assign/);
});

test('checkout separates retryable known failures from unknown order outcomes', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const presentation = readFileSync('src/checkout/submit-error-copy.ts', 'utf8');

  assert.match(presentation, /outcome: 'known' \| 'unknown'/);
  assert.match(presentation, /retryAllowed: boolean/);
  assert.match(
    presentation,
    /messageKey: 'networkUnconfirmed'[\s\S]*outcome: 'unknown'[\s\S]*retryAllowed: false/
  );
  assert.match(client, /snapshot\.submitError\.outcome === 'unknown'/);
  assert.match(client, /getAccountOrdersPath\(locale\)/);
  assert.match(client, /getGuestOrderPath\(locale\)/);
  assert.match(session, /idempotencyInMemory = null;/);
  const recoveryStart = client.indexOf("snapshot.submitError.outcome === 'unknown'");
  const recoveryEnd = client.indexOf('snapshot.submitResult.errorId', recoveryStart);
  assert.ok(recoveryEnd > recoveryStart);
  assert.doesNotMatch(client.slice(recoveryStart, recoveryEnd), /retryQuote|submit\(\)|Try again/);
});

test('checkout removes only final ordered quantities after successful order creation', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const cartStore = readFileSync('src/cart/cart-store.ts', 'utf8');
  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const placeStart = session.indexOf('async function placeOrderForQuote(');
  const successBranch = session.indexOf("if (result.status === 'success')", placeStart);
  const notifyCall = session.indexOf('ports.onOrderCreated(', successBranch);
  const priorSource = session.slice(0, successBranch);
  const branchSource = session.slice(successBranch, notifyCall);

  assert.ok(successBranch >= 0);
  assert.ok(notifyCall > successBranch);
  assert.doesNotMatch(priorSource, /ports\.onOrderCreated\(/);
  assert.match(branchSource, /line\.status === 'ready'/);
  assert.match(branchSource, /line\.status === 'quantity_capped'/);
  assert.match(branchSource, /quantity:\s*line\.quantity/);
  assert.doesNotMatch(branchSource, /quantity:\s*line\.requestedQuantity/);
  assert.match(
    client,
    /onOrderCreated:[\s\S]*commitPlacedOrder\(\{\s*orderNumber,\s*completedLines\s*\}\)[\s\S]*router\.push\(orderPath\)/
  );
  assert.match(cartStore, /subtractCompletedOrderLines/);
  assert.match(cartStore, /writeOrderSnapshot/);
  assert.match(cartStore, /clearCartQuoteCache/);
  assert.match(cartStore, /writeGuestCart/);
});

test('checkout address persistence derives identity server-side and cannot affect order success', () => {
  const source = readFileSync('src/account/address-actions.ts', 'utf8');
  const actionStart = source.indexOf('export async function saveCheckoutShippingAddressAction');
  const actionSource = source.slice(actionStart);

  assert.ok(actionStart >= 0);
  assert.match(actionSource, /requireUser|authenticatedClient/);
  assert.match(actionSource, /saveCustomerShippingAddress/);
  assert.match(actionSource, /address_save_failed/);
  assert.doesNotMatch(actionSource, /userId|ownerId|customerId|orderStatus|paymentStatus/);
  assert.doesNotMatch(actionSource, /\.from\(['"]customer_shipping_addresses['"]\)/);
});

test('checkout support config crosses only the server page narrow DTO seam', () => {
  const route = readFileSync('src/app/[locale]/checkout/page.tsx', 'utf8');
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const links = readFileSync('src/components/support/support-links.tsx', 'utf8');
  const config = readFileSync('src/support/config.ts', 'utf8');

  assert.match(route, /getPublicSupportConfig/);
  assert.match(route, /publicSupportConfig=\{publicSupportConfig\}/);
  assert.match(client, /publicSupportConfig\?: PublicSupportConfig/);
  assert.match(client, /<SupportLinks[\s\S]*config=\{publicSupportConfig\}/);
  assert.doesNotMatch(client, /@\/support\/config|@\/lib\/env\/server|process\.env|SUPPORT_EMAIL|SUPPORT_ZALO_URL/);
  assert.doesNotMatch(links, /@\/support\/config|@\/lib\/env\/server|process\.env|SUPPORT_EMAIL|SUPPORT_ZALO_URL/);
  assert.match(links, /config\.emailHref \?/);
  assert.match(links, /config\.zaloHref \?/);
  assert.match(config, /url\.hostname === 'zalo\.me'/);
  assert.doesNotMatch(route, /getServerEnv|process\.env|SUPPORT_EMAIL|SUPPORT_ZALO_URL/);
});

test('incident references expose only an opaque copyable identifier with durable feedback', () => {
  const incident = readFileSync('src/components/support/incident-reference.tsx', 'utf8');

  assert.match(incident, /incidentId: string/);
  assert.match(incident, /navigator\.clipboard\.writeText\(incidentId\)/);
  assert.match(incident, /min-h-11/);
  assert.match(incident, /aria-live="polite"/);
  assert.match(incident, /document\.createRange\(\)/);
  assert.doesNotMatch(
    incident,
    /orderNumber|contactEmail|shippingAddress|guestAccessToken|idempotency|provider|amountMinor|bank|URLSearchParams|encodeURIComponent/
  );
});

test('ASVS L1 checkout authority matrix keeps browser state as intent and server facts authoritative', () => {
  const client = readFileSync('src/components/checkout/checkout-page.tsx', 'utf8');
  const draft = readFileSync('src/checkout/editable-draft.ts', 'utf8');
  const shippingAddress = readFileSync('src/checkout/shipping-address.ts', 'utf8');
  const vietnamAddress = readFileSync('src/checkout/vietnam-address.ts', 'utf8');
  const addressActions = readFileSync('src/account/address-actions.ts', 'utf8');
  const support = readFileSync('src/support/config.ts', 'utf8');
  const submit = readFileSync('src/checkout/submit-checkout.ts', 'utf8');
  const authoritativeSubmit = readFileSync(
    'supabase/migrations/20260714150000_harden_checkout_submit_authority.sql',
    'utf8'
  );
  const immutableOrder = readFileSync(
    'supabase/migrations/20260618093000_checkout_shipping_address_snapshot.sql',
    'utf8'
  );

  assert.match(draft, /CHECKOUT_EDITABLE_DRAFT_TTL_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(draft, /CHECKOUT_EDITABLE_DRAFT_MAX_BYTES = 16 \* 1024/);
  assert.match(draft, /topLevelKeys = \['version', 'scope', 'savedAt', 'expiresAt', 'email', 'shippingAddress'\]/);
  assert.doesNotMatch(
    draft,
    /guestAccessToken|attemptId|\bproof\b|quoteHash|paymentStatus|provider|saveAddress|saveConsent|localStorage/i
  );

  assert.match(shippingAddress, /normalizeVietnamPhone/);
  assert.match(shippingAddress, /validateVietnamAddress/);
  assert.match(vietnamAddress, /findVietnamAddressPair/);
  assert.match(addressActions, /checkoutAddressSaveRequestSchema\.safeParse/);
  assert.match(addressActions, /authenticatedClient\(request\.data\.locale/);
  assert.doesNotMatch(
    addressActions.slice(addressActions.indexOf('export async function saveCheckoutShippingAddressAction')),
    /userId|ownerId|customerId/
  );

  assert.match(support, /z\.email\(\)/);
  assert.match(support, /url\.protocol === 'https:'[\s\S]*url\.hostname === 'zalo\.me'/);
  assert.match(submit, /quoteMarket === 'intl' && currencyCode === 'USD' && input\.paymentIntent === 'paypal_intent'/);
  assert.match(submit, /quoteMarket === 'vn' && currencyCode === 'VND' && input\.paymentIntent === 'vietqr_intent'/);

  const session = readFileSync('src/checkout/checkout-session.ts', 'utf8');
  const submitStart = session.indexOf('async submit()');
  const requote = session.indexOf('await requestQuote(', submitStart);
  const materialReview = session.indexOf('if (proposal)', requote);
  const placeOrderCall = session.indexOf('await placeOrderForQuote(', materialReview);
  const placeOrderDef = session.indexOf('async function placeOrderForQuote(');
  const persist = session.indexOf('await ports.submitOrder(submitInput)', placeOrderDef);
  assert.ok(submitStart >= 0 && requote > submitStart && materialReview > requote && placeOrderCall > materialReview);
  assert.ok(placeOrderDef >= 0 && persist > placeOrderDef);

  // A pay attempt interrupted by the material-change dialog resumes after the
  // customer accepts, so that second path must not become a way around the
  // gate: the order is still persisted from exactly one place, the interrupted
  // attempt returns without persisting anything, and the resume runs only from
  // an explicit acceptance and only after re-checking the submit preconditions.
  assert.equal(session.split('await ports.submitOrder(submitInput)').length - 1, 1);
  assert.equal(session.split('await placeOrderForQuote(').length - 1, 2);
  assert.match(session, /resumeSubmitAfterReview = true;[\s\S]{0,160}?return \{ status: 'needs_review' \};/);
  assert.match(
    session,
    /async acceptProposalAndResume\(\)[\s\S]{0,600}?resumeSubmitAfterReview = false;[\s\S]{0,1200}?await placeOrderForQuote\(/
  );
  assert.match(session, /!addressReady/);
  assert.match(
    session,
    /rejectProposal\(\) \{[\s\S]{0,120}?resumeSubmitAfterReview = false;/
  );

  assert.match(authoritativeSubmit, /private\.checkout_commercial_quote_is_current/);
  assert.match(authoritativeSubmit, /for update/);
  assert.match(authoritativeSubmit, /insert into public\.checkout_order_shipping_allocations/);
  assert.match(immutableOrder, /accepted_quote_hash,[\s\S]*quote_snapshot,[\s\S]*cart_snapshot,[\s\S]*shipping_address/);
  assert.match(immutableOrder, /insert into public\.checkout_inventory_reservations/);
  assert.match(immutableOrder, /checkout_orders_immutable_shipping_address/);
  assert.doesNotMatch(
    client,
    /\.from\(['"](?:checkout_orders|checkout_order_lines|checkout_inventory_reservations|payments)['"]\)/
  );
});
