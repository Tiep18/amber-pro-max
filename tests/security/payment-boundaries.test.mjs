import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const contractFiles = [
  'tests/unit/payments/status-mapping.test.ts',
  'tests/unit/payments/paypal-client.test.ts',
  'tests/unit/payments/paypal-webhook.test.ts',
  'tests/unit/payments/vietqr.test.ts',
  'tests/integration/payment-concurrency.mjs',
  'tests/e2e/order-status.spec.ts',
  'tests/e2e/admin-orders.spec.ts',
  'tests/e2e/admin-vietqr.spec.ts',
  'supabase/tests/database/04_payment_model.test.sql',
  'supabase/tests/database/04_payment_transitions.test.sql',
  'supabase/tests/database/04_payment_rls_audit.test.sql',
  'tests/fixtures/payments/paypal-events.ts'
];

const paymentSurfaceFiles = [
  'src/payments/schemas.ts',
  'src/payments/types.ts',
  'src/payments/transitions.ts',
  'src/payments/queries.ts',
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
