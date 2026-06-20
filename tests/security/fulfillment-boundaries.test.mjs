import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const contractFiles = [
  'supabase/tests/database/05_fulfillment_entitlements.test.sql',
  'supabase/tests/database/05_email_outbox.test.sql',
  'supabase/tests/database/05_guest_claim.test.sql',
  'supabase/tests/database/05_physical_fulfillment.test.sql',
  'supabase/migrations/20260619085118_fulfillment_purchase_access.sql',
  'src/fulfillment/schemas.ts'
];

const fulfillmentSurfaceFiles = [
  'src/lib/supabase/admin.ts',
  'src/app/[locale]/orders/[orderNumber]/page.tsx',
  'src/app/[locale]/don-hang/[orderNumber]/page.tsx',
  'src/components/payments/order-payment-page.tsx',
  'src/components/fulfillment/download-panel.tsx'
];

const fulfillmentAccountFiles = [
  'src/fulfillment/account-queries.ts',
  'src/components/fulfillment/account-order-history.tsx',
  'src/components/fulfillment/pattern-library.tsx',
  'src/components/fulfillment/pattern-library-card.tsx',
  'src/app/[locale]/account/orders/page.tsx',
  'src/app/[locale]/account/patterns/page.tsx',
  'src/app/[locale]/tai-khoan/don-hang/page.tsx',
  'src/app/[locale]/tai-khoan/mau-pdf/page.tsx'
];

const fulfillmentEmailFiles = [
  'src/emails/transactional.ts',
  'src/fulfillment/email-outbox.ts',
  'src/fulfillment/email-outbox.server.ts',
  'src/app/api/fulfillment/email-outbox/route.ts',
  'src/fulfillment/admin-email-actions.ts',
  'src/components/admin/fulfillment/failed-email-queue.tsx'
];

function readExisting(files) {
  return files
    .filter((file) => existsSync(file))
    .map((file) => `\n/* ${file} */\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

test('Phase 5 fulfillment contract files exist', () => {
  assert.deepEqual(
    contractFiles.filter((file) => !existsSync(file)),
    []
  );
});

test('fulfillment surfaces store hashes and never raw download token material', () => {
  const source = readExisting(contractFiles);

  assert.match(source, /token_hash/);
  assert.match(source, /expires_at/);
  assert.match(source, /interval '24 hours'/);
  assert.doesNotMatch(source, /rawDownloadToken|downloadToken\s*[:=]|plainToken|token_secret/i);
});

test('fulfillment implementation does not expose public PDF storage or browser signed URL creation', () => {
  const source = readExisting(fulfillmentSurfaceFiles);

  assert.doesNotMatch(source, /createSignedUrl|signedUrl|private.*pdf/i);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret_/i);
  assert.doesNotMatch(source, /token_hash|object_path|pattern-pdfs/i);
});

test('download signed URL creation is isolated behind entitlement authorization', () => {
  const pureService = readFileSync('src/fulfillment/downloads.ts', 'utf8');
  const serverAdapter = readFileSync('src/fulfillment/downloads.server.ts', 'utf8');
  const route = readFileSync('src/app/api/downloads/route.ts', 'utf8');

  assert.match(pureService, /authorizeDownloadRequest/);
  assert.match(serverAdapter, /createSignedUrl/);
  assert.match(serverAdapter, /authorizeDownloadRequest/);
  assert.match(route, /authorizeDownloadWithSupabase/);
  assert.doesNotMatch(route, /bucket_id|object_path|signed_url|token_hash|pattern-pdfs/i);
});

test('transactional email worker keeps tokens and provider secrets out of durable payloads', () => {
  const source = readExisting(fulfillmentEmailFiles);
  const route = readFileSync('src/app/api/fulfillment/email-outbox/route.ts', 'utf8');

  assert.match(route, /authorization|x-worker-secret/i);
  assert.match(route, /transactionalEmailWorkerSecret/);
  const sanitizerPattern = /export function sanitizeEmailFailureCode[\s\S]*?export function validateRetryCandidate/;
  const sourceWithoutSanitizer = source.replace(sanitizerPattern, 'export function validateRetryCandidate');

  assert.doesNotMatch(sourceWithoutSanitizer, /console\.(log|error|warn)|provider_payload|signed_url|signedUrl|object_path|pattern-pdfs/i);
  assert.doesNotMatch(source, /RESEND_API_KEY|TRANSACTIONAL_EMAIL_WORKER_SECRET/);
  assert.doesNotMatch(source, /attachments\s*:/i);
});

test('account purchase library delegates downloads through the app route without private storage details', () => {
  const source = readExisting(fulfillmentAccountFiles);

  assert.match(source, /\/api\/downloads/);
  assert.doesNotMatch(source, /createSignedUrl|signedUrl|token_hash|bucket_id|object_path|pattern-pdfs|SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test('fulfillment audit and outbox payloads reject unsafe secrets', () => {
  const migration = readFileSync(
    'supabase/migrations/20260619085118_fulfillment_purchase_access.sql',
    'utf8'
  );

  assert.match(migration, /fulfillment_safe_json/);
  assert.match(migration, /transactional_email_outbox_safe_payload/);
  assert.match(migration, /fulfillment_audit_events_append_only/);
  assert.match(migration, /payment_transition_grants_digital_entitlements/);
  assert.doesNotMatch(
    migration,
    /grant\s+execute\s+on\s+function\s+private\.grant_paid_digital_entitlements[\s\S]*authenticated/i
  );
});

test('npm security script includes the Phase 5 fulfillment boundary harness', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.match(
    packageJson.scripts['test:security'],
    /tests\/security\/fulfillment-boundaries\.test\.mjs/
  );
});
