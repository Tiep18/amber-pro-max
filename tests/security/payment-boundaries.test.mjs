import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const contractFiles = [
  'tests/unit/payments/status-mapping.test.ts',
  'tests/unit/payments/order-recovery.test.ts',
  'tests/unit/payments/paypal-client.test.ts',
  'tests/unit/payments/paypal-webhook.test.ts',
  'tests/unit/payments/vietqr.test.ts',
  'tests/integration/payment-concurrency.mjs',
  'tests/e2e/order-status.spec.ts',
  'tests/e2e/payment-ux.spec.ts',
  'tests/e2e/admin-orders.spec.ts',
  'tests/e2e/admin-vietqr.spec.ts',
  'supabase/tests/database/04_payment_model.test.sql',
  'supabase/tests/database/04_payment_transitions.test.sql',
  'supabase/tests/database/04_payment_rls_audit.test.sql',
  'tests/fixtures/payments/paypal-events.ts'
];

const customerRecoveryFiles = [
  'src/payments/status.ts',
  'src/payments/order-recovery.ts',
  'src/components/payments/order-recovery-banner.tsx'
];

const vietQrDownloadRoute = 'src/app/[locale]/orders/[orderNumber]/qr/route.ts';

const paymentSurfaceFiles = [
  'src/checkout/actions.ts',
  'src/checkout/submit-checkout.ts',
  'src/payments/schemas.ts',
  'src/payments/types.ts',
  'src/payments/transitions.ts',
  'src/payments/queries.ts',
  'src/payments/guest-access.ts',
  'src/lib/env/server.ts',
  'src/lib/supabase/admin.ts',
  'src/payments/paypal/client.ts',
  'src/payments/paypal/mapping.ts',
  'src/payments/paypal/verification.ts',
  'src/payments/vietqr/instructions.ts',
  'src/payments/admin-actions.ts',
  'src/app/api/paypal/orders/route.ts',
  'src/app/api/paypal/orders/[paypalOrderId]/capture/route.ts',
  'src/app/api/webhooks/paypal/route.ts',
  'src/app/[locale]/order/[orderNumber]/page.tsx',
  'src/components/payments/paypal-buttons.tsx',
  'src/components/payments/vietqr-instructions.tsx',
  'src/components/payments/payment-status-badge.tsx',
  'src/components/payments/order-payment-page.tsx',
  'src/components/payments/order-line-summary.tsx',
  'src/app/admin/orders/page.tsx',
  'src/app/admin/orders/[orderId]/page.tsx',
  'src/components/admin/orders/payment-timeline.tsx',
  'src/components/admin/orders/vietqr-evidence-form.tsx'
];

function readExisting(files) {
  return files.filter((file) => existsSync(file)).map((file) => `\n/* ${file} */\n${readFileSync(file, 'utf8')}`).join('\n');
}

test('Phase 4 payment contract files exist before implementation plans run', () => {
  assert.deepEqual(
    contractFiles.filter((file) => !existsSync(file)),
    []
  );
});

test('payment fixtures and tests do not contain live seller credentials or secrets', () => {
  const source = readExisting(contractFiles);

  assert.doesNotMatch(source, /PAYPAL_CLIENT_SECRET\s*=\s*['"][^'"]+/i);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+/i);
  assert.doesNotMatch(source, /VietQR.*(account|bank).*(real|production|live)/i);
  assert.doesNotMatch(source, /access_token['"]?\s*[:=]\s*['"][A-Za-z0-9._-]{20,}/i);
  assert.match(source, /fixture-signature-not-valid-for-production/);
});

test('client payment surfaces never expose server-only payment or Supabase secrets', () => {
  const clientSource = readExisting([
    'src/app/[locale]/order/[orderNumber]/page.tsx',
    'src/components/payments/paypal-buttons.tsx',
    'src/components/payments/vietqr-instructions.tsx',
    'src/components/payments/payment-status-badge.tsx',
    'src/components/checkout/checkout-page.tsx'
  ]);

  assert.doesNotMatch(clientSource, /PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID|PAYPAL_EXPECTED_MERCHANT_ID/i);
  assert.doesNotMatch(clientSource, /SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret_/i);
  assert.doesNotMatch(clientSource, /rawGuestToken|guestAccessToken.*localStorage|providerPayload|webhook.*body/i);
});

test('VietQR audit facts never persist the QR URL containing the full receiving account number', () => {
  const source = readFileSync('src/payments/vietqr/instructions.ts', 'utf8');
  const sanitizedFacts = source.match(/sanitizedFacts:\s*\{([\s\S]*?)\n\s*\}/)?.[1];

  assert.ok(sanitizedFacts, 'VietQR transition must retain a sanitized facts block');
  assert.doesNotMatch(sanitizedFacts, /qrImageUrl/);
  assert.match(sanitizedFacts, /qrImageAvailable:\s*true/);
});

test('checkout handoff exchanges guest access server-side without returning raw tokens', () => {
  const actionSource = readFileSync('src/checkout/actions.ts', 'utf8');
  const submitSource = readFileSync('src/checkout/submit-checkout.ts', 'utf8');

  assert.match(actionSource, /setGuestOrderAccessCookieFromServer/);
  assert.doesNotMatch(actionSource, /SubmitCheckoutActionState\s*=\s*SubmitCheckoutResult/);
  assert.doesNotMatch(actionSource, /localStorage|sessionStorage|console\.(log|info|warn|error)\([^)]*guestAccessToken/s);
  assert.match(submitSource, /invalid_payment_method_for_market/);
  assert.match(submitSource, /intl[\s\S]{0,160}USD[\s\S]{0,160}paypal_intent/);
  assert.match(submitSource, /vn[\s\S]{0,160}VND[\s\S]{0,160}vietqr_intent/);
});

test('payment implementation cannot add direct paid, order, inventory, or fulfillment mutation shortcuts', () => {
  const source = readExisting(paymentSurfaceFiles);

  assert.doesNotMatch(source, /\.from\(['"]checkout_orders['"]\)\.update\([^)]*paid/i);
  assert.doesNotMatch(source, /\.from\(['"]checkout_inventory_reservations['"]\)\.delete/i);
  assert.doesNotMatch(source, /markPaid|manualMarkPaid|customerConfirmedPaid|iHavePaid/i);
  assert.doesNotMatch(source, /createSignedUrl|digital entitlement|download link|shipment|tracking number/i);
});

test('payment boundary contracts require webhook verification, idempotency, audit, and non-enumerating access', () => {
  const source = readExisting(contractFiles);

  assert.match(source, /forged signatures/i);
  assert.match(source, /duplicate provider events/i);
  assert.match(source, /transition keys are unique/i);
  assert.match(source, /audit rows are append-only/i);
  assert.match(source, /non-enumerating/i);
  assert.match(source, /fulfillment locked/i);
});

test('order line and money breakdown reach the customer only through the per-order authorized RPC, never a direct table read', () => {
  const source = readExisting(paymentSurfaceFiles);

  // checkout_order_lines has no anon grant at all (revoke all ... from
  // anon; grant select ... to authenticated only) — a direct client-side
  // select would either fail for guest orders or require weakening that
  // grant. Line data must only reach the client embedded in
  // get_order_payment_status()'s already-authorized jsonb result.
  assert.doesNotMatch(source, /\.from\(['"]checkout_order_lines['"]\)/);
  assert.doesNotMatch(source, /\.from\(['"]discount_redemptions['"]\)/);
  assert.match(source, /get_order_payment_status/);
});

test('the customer order surface never renders a raw, unmasked contact email', () => {
  const source = readExisting(paymentSurfaceFiles);

  assert.doesNotMatch(source, /order\.contactEmail\b(?!Masked)/);
  assert.match(source, /contactEmailMasked/);
});

test('missing and unauthorized orders share generic guest recovery without enumeration', () => {
  const source = readFileSync('src/components/payments/order-payment-page.tsx', 'utf8');
  const denialStart = source.indexOf("if (result.status !== 'found')");
  const denialEnd = source.indexOf('const status = mapCustomerPaymentStatus', denialStart);
  const denial = source.slice(denialStart, denialEnd);

  assert.ok(denialStart >= 0);
  assert.ok(denialEnd > denialStart);
  assert.match(denial, /accessDenied\.heading/);
  assert.match(denial, /accessDenied\.body/);
  assert.match(denial, /getGuestOrderPath\(locale\)/);
  assert.match(denial, /accessDenied\.recoverGuest/);
  assert.match(denial, /<SupportLinks[\s\S]*config=\{publicSupportConfig\}/);
  assert.doesNotMatch(denial, /result\.order|orderNumber|provider|amountMinor|currencyCode|contactEmail/);
});

test('terminal recovery restores intent through cart authority and never retries or mutates the order', () => {
  const source = readExisting(customerRecoveryFiles);
  const statusSource = readFileSync('src/payments/status.ts', 'utf8');
  const bannerSource = readFileSync('src/components/payments/order-recovery-banner.tsx', 'utf8');

  assert.match(statusSource, /sameOrderRetryAllowed:\s*false/);
  assert.doesNotMatch(statusSource, /orders\.actions\.newCheckout/);
  assert.match(bannerSource, /restoreOrderSnapshot/);
  assert.match(bannerSource, /router\.push\(cartHref\)/);
  assert.match(bannerSource, /catalogHref/);
  assert.doesNotMatch(source, /applyPaymentTransition|createPayPalOrder|capturePayPalOrder|declareVietQrTransferAction/);
  assert.doesNotMatch(source, /\.from\(['"](?:checkout_orders|payments|checkout_inventory_reservations|download_entitlements)['"]\)/);
});

test('authorized payment composition has one pending deadline owner and state-specific primary action', () => {
  const pageSource = readFileSync('src/components/payments/order-payment-page.tsx', 'utf8');
  const panelSource = readFileSync('src/components/payments/payment-state-panel.tsx', 'utf8');
  const authorizedStart = pageSource.indexOf('const status = mapCustomerPaymentStatus');
  const authorized = pageSource.slice(authorizedStart);

  assert.ok(authorizedStart >= 0);
  assert.match(authorized, /presentation\.showPendingDeadline/);
  assert.doesNotMatch(authorized, /getCheckoutPath\(locale\)/);
  assert.doesNotMatch(authorized, /<ReservationCountdown\b/);
  assert.match(authorized, /status=\{status\.status\}/);
  assert.match(authorized, /catalogHref=\{getCatalogPath\(locale\)\}/);
  assert.match(authorized, /browse:\s*t\('recovery\.browse'\)/);
  assert.match(authorized, /storeTimeZone=\{publicSupportConfig\.storeTimeZone\}/);
  assert.match(panelSource, /recheckProvider/);
  assert.match(panelSource, /pollingStopped/);
});

test('paid, refund, and terminal composition does not render provider controls or live reservation work', () => {
  const source = readFileSync('src/components/payments/order-payment-page.tsx', 'utf8');

  assert.match(source, /showPayPal[\s\S]*status\.status === 'awaiting_payment'/);
  assert.match(source, /showVietQr[\s\S]*status\.status === 'awaiting_payment'/);
  assert.match(source, /showPendingDeadline[\s\S]*presentation\.showPendingDeadline/);
  assert.match(source, /showPaidSuccess[\s\S]*status\.isPaid/);
  assert.match(source, /showRefundFulfillmentDetails[\s\S]*status\.isPaid/);
});

test('VietQR attachment authorizes the localized order before deriving or fetching the fixed upstream', () => {
  assert.ok(existsSync(vietQrDownloadRoute));
  const source = readFileSync(vietQrDownloadRoute, 'utf8');
  const authorizedLookup = source.lastIndexOf('getAuthorizedOrderPayment(');
  const paymentWindowCheck = source.lastIndexOf('isVietQrPaymentWindowOpen(');
  const quickLink = source.lastIndexOf('buildQuickLinkUrl(');
  const externalFetch = source.indexOf('fetch(');

  assert.ok(authorizedLookup >= 0);
  assert.ok(paymentWindowCheck > authorizedLookup);
  assert.ok(quickLink > paymentWindowCheck);
  assert.ok(externalFetch > quickLink);
  assert.match(source, /getGuestOrderAccessHashFromServer\(orderNumber\)/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /order\.market\s*!==\s*'vn'/);
  assert.match(source, /order\.currencyCode\s*!==\s*'VND'/);
  assert.match(source, /order\.paymentIntent\s*!==\s*'vietqr_intent'/);
  assert.match(source, /order\.paymentStatus\s*!==\s*'pending'/);
  assert.doesNotMatch(source, /searchParams|\.json\(\)|\.formData\(\)|callerUrl|rawGuestToken/);
});

test('VietQR attachment rejects redirects, timeout, wrong MIME, non-2xx, and oversized bodies', () => {
  const source = readFileSync(vietQrDownloadRoute, 'utf8');

  assert.match(source, /protocol\s*===\s*'https:'[\s\S]*hostname\s*===\s*'img\.vietqr\.io'[\s\S]*pathname\.startsWith\('\/image\/'\)/);
  assert.match(source, /redirect:\s*'error'/);
  assert.match(source, /AbortController/);
  assert.match(source, /setTimeout\([\s\S]*\.abort\(\)/);
  assert.match(source, /1\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source, /getReader\(\)/);
  assert.match(source, /totalBytes\s*>\s*MAX_QR_BYTES/);
  assert.match(source, /!upstream\.ok/);
  assert.match(source, /content-type[\s\S]*image\/png/i);
});

test('VietQR attachment is private, sanitized, non-enumerating, and mutation-free', () => {
  const source = readFileSync(vietQrDownloadRoute, 'utf8');

  assert.match(source, /buildVietQrDownloadFilename\(orderNumber\)/);
  assert.match(source, /Content-Disposition['"]?\s*:\s*`attachment; filename="\$\{filename\}"`/);
  assert.match(source, /Cache-Control['"]?\s*:\s*'private, no-store'/);
  assert.match(source, /X-Content-Type-Options['"]?\s*:\s*'nosniff'/);
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)|qrImageUrl/);
  assert.doesNotMatch(source, /applyPaymentTransition|declareVietQrTransferAction|createSignedUrl/);
  assert.doesNotMatch(source, /\.from\(['"](?:checkout_orders|payments|checkout_inventory_reservations|download_entitlements)['"]\)/);
});

test('verified paid alone leads with confirmation, masked email, and relevant next steps', () => {
  const source = readFileSync('src/components/payments/order-payment-page.tsx', 'utf8');
  const paidStart = source.indexOf('const paidSuccess = showPaidSuccess ?');
  const paidEnd = source.indexOf('  return (', paidStart);
  const paidLead = source.slice(paidStart, paidEnd);

  assert.match(source, /const showPaidSuccess\s*=\s*status\.isPaid\s*&&\s*!status\.isRefunded/);
  assert.ok(paidStart >= 0);
  assert.ok(paidEnd > paidStart);
  assert.match(paidLead, /CircleCheck/);
  assert.match(source, /showPaidSuccess\s*\?\s*t\('status\.paid\.heading'\)/);
  assert.match(paidLead, /status\.paid\.confirmedTotal/);
  assert.match(paidLead, /status\.paid\.email[\s\S]*contactEmailMasked/);
  assert.doesNotMatch(paidLead, /customerTransferDeclaredAt|reservationExpiresAt|searchParams|window\.|Date\.now/);
  assert.match(source, /showPaidSuccess[\s\S]*hasDigitalLines[\s\S]*<DownloadPanel/);
  assert.match(source, /showPaidSuccess[\s\S]*hasPhysicalLines[\s\S]*<PhysicalTrackingPanel/);
});

test('paid downloads keep the existing entitlement-authorized private route unchanged', () => {
  const pageSource = readFileSync('src/components/payments/order-payment-page.tsx', 'utf8');
  const downloadRoute = readFileSync('src/app/api/downloads/route.ts', 'utf8');

  assert.match(pageSource, /<DownloadPanel[\s\S]*orderNumber=\{result\.order\.orderNumber\}/);
  assert.doesNotMatch(pageSource, /createSignedUrl|signedUrl|\/storage\/v1\/object|token=/);
  assert.match(downloadRoute, /authorizeDownloadWithSupabase/);
  assert.match(downloadRoute, /getGuestOrderAccessHashFromServer/);
  assert.match(downloadRoute, /result\.status !== 'authorized'/);
  assert.match(downloadRoute, /NextResponse\.redirect\(result\.url, \{status: 303\}\)/);
});

test('ASVS L1 payment authority matrix preserves verified transitions, inventory outcomes, and private access', () => {
  const webhook = readFileSync('src/app/api/webhooks/paypal/route.ts', 'utf8');
  const transitions = readFileSync('src/payments/transitions.ts', 'utf8');
  const transitionMigration = readFileSync(
    'supabase/migrations/20260802170000_late_payment_settlement.sql',
    'utf8'
  );
  const entitlementMigration = readFileSync(
    'supabase/migrations/20260619085118_fulfillment_purchase_access.sql',
    'utf8'
  );
  const download = readFileSync('src/fulfillment/downloads.ts', 'utf8');
  const downloadServer = readFileSync('src/fulfillment/downloads.server.ts', 'utf8');
  const guestTokens = readFileSync('src/fulfillment/guest-order-tokens.ts', 'utf8');
  const qrRoute = readFileSync(vietQrDownloadRoute, 'utf8');

  const verify = webhook.indexOf('await verifyPayPalWebhook(');
  const transition = webhook.indexOf('await applyPaymentTransition(', verify);
  assert.ok(verify >= 0 && transition > verify);
  assert.match(webhook.slice(verify, transition), /verification\.status !== 'verified'/);
  assert.match(transitions, /client\.rpc\('apply_payment_transition'/);
  assert.doesNotMatch(transitions, /\.from\(['"](?:payments|checkout_orders|checkout_inventory_reservations)['"]\)/);

  assert.match(transitionMigration, /source_name not in \('paypal_webhook', 'paypal_recheck', 'vietqr_instruction', 'vietqr_admin'/);
  assert.match(transitionMigration, /source_name = 'vietqr_instruction' and target_status <> 'pending'/);
  assert.match(transitionMigration, /effective_status = 'paid'[\s\S]*inventory_effect := 'finalized'/);
  assert.match(transitionMigration, /effective_status in \('failed', 'cancelled', 'rejected'\)[\s\S]*inventory_effect := 'released'/);
  assert.match(transitionMigration, /set status = 'consumed',[\s\S]*finalized_at = now_ts/);
  assert.match(transitionMigration, /set status = case when inventory_effect = 'expired' then 'expired' else 'released' end/);
  assert.match(transitionMigration, /when effective_status = 'paid' then 'payment_verified_paid'/);
  assert.match(transitionMigration, /revoke all on function public\.apply_payment_transition\(jsonb\) from public, anon, authenticated/);

  assert.match(entitlementMigration, /p\.status = 'paid' and co\.paid_gate_status = 'open'/);
  assert.match(entitlementMigration, /new\.result = 'applied' and new\.to_status = 'paid'/);
  assert.match(entitlementMigration, /token_hash/);
  assert.match(entitlementMigration, /revoke all on table public\.digital_entitlements from public, anon, authenticated/);
  assert.match(download, /SIGNED_URL_TTL_SECONDS = 300/);
  assert.match(download, /isOwner\([\s\S]*isTokenUsable/);
  assert.match(downloadServer, /client\.storage\.from\(bucketId\)\.createSignedUrl\(objectPath, expiresInSeconds\)/);
  assert.match(guestTokens, /hashGuestOrderAccessToken\(rawToken\)/);

  assert.match(qrRoute, /getAuthorizedOrderPayment/);
  assert.match(qrRoute, /redirect:\s*'error'/);
  assert.match(qrRoute, /Cache-Control['"]?\s*:\s*'private, no-store'/);
  assert.doesNotMatch(qrRoute, /applyPaymentTransition|declareVietQrTransferAction|createSignedUrl/);
});

test('npm security script includes the Phase 4 payment boundary harness', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.match(packageJson.scripts['test:security'], /tests\/security\/payment-boundaries\.test\.mjs/);
});
