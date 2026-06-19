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
  'src/app/[locale]/order/[orderNumber]/page.tsx',
  'src/components/payments/order-payment-page.tsx'
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
