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
  'src/components/payments/order-payment-page.tsx',
  'src/components/fulfillment/download-panel.tsx'
];

const fulfillmentAccountFiles = [
  'src/fulfillment/account-queries.ts',
  'src/components/fulfillment/account-order-history.tsx',
  'src/components/fulfillment/pattern-library.tsx',
  'src/components/fulfillment/pattern-library-card.tsx',
  'src/app/[locale]/account/orders/page.tsx',
  'src/app/[locale]/account/patterns/page.tsx'
];

const fulfillmentCustomerTrackingFiles = [
  'src/components/fulfillment/fulfillment-track-summary.tsx',
  'src/components/fulfillment/physical-tracking-panel.tsx',
  'src/components/payments/order-payment-page.tsx'
];

const fulfillmentPhysicalFiles = [
  'src/fulfillment/physical.ts',
  'src/components/admin/fulfillment/physical-fulfillment-action-form.tsx',
  'src/components/admin/fulfillment/physical-fulfillment-form.tsx',
  'src/components/admin/orders/order-detail.tsx',
  'src/components/admin/orders/order-queue.tsx'
];

const fulfillmentGuestClaimFiles = [
  'src/fulfillment/order-claim.ts',
  'src/fulfillment/guest-order-tokens.ts',
  'src/fulfillment/order-reopen.ts',
  'src/fulfillment/guest-access.ts',
  'src/components/fulfillment/guest-reopen-form.tsx',
  'src/components/fulfillment/order-claim-panel.tsx',
  'src/app/[locale]/guest-order/page.tsx',
  'src/app/[locale]/orders/[orderNumber]/claim/page.tsx',
  'src/app/api/orders/access/route.ts'
];

const fulfillmentAdminEntitlementFiles = [
  'src/fulfillment/entitlements.ts',
  'src/fulfillment/admin-entitlement-actions.ts',
  'src/components/admin/fulfillment/entitlement-actions.tsx',
  'src/components/admin/fulfillment/entitlement-audit-list.tsx'
];

const fulfillmentEmailFiles = [
  'src/emails/transactional.ts',
  'src/fulfillment/email-outbox.ts',
  'src/fulfillment/email-outbox.server.ts',
  'src/app/api/fulfillment/email-outbox/route.ts',
  'src/fulfillment/admin-email-actions.ts',
  'src/components/admin/fulfillment/failed-email-queue.tsx'
];

const digitalLifecycleMigration =
  'supabase/migrations/20260817120000_repair_digital_download_token_lifecycle.sql';
const transactionalEmailCapabilityMigration =
  'supabase/migrations/20260826120000_atomic_transactional_email_capability_issuance.sql';
const adminEmailRecoveryMigration =
  'supabase/migrations/20260828130000_atomic_admin_email_recovery.sql';
const publicEmailQuotaMigration =
  'supabase/migrations/20260828160000_public_email_quota_guards.sql';

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

test('digital download lifecycle migration revokes orphan capabilities and hardens its RPC boundary', () => {
  assert.ok(
    existsSync(digitalLifecycleMigration),
    'forward-only digital lifecycle repair migration must exist'
  );

  const migration = readFileSync(digitalLifecycleMigration, 'utf8');

  assert.match(
    migration,
    /update\s+public\.digital_access_tokens[\s\S]*status\s*=\s*'revoked'[\s\S]*revoked_at\s*=[\s\S]*where[\s\S]*status\s*=\s*'active'[\s\S]*source_email_outbox_id\s+is\s+null/i
  );
  assert.match(
    migration,
    /drop\s+function\s+public\.reissue_digital_access_token\s*\(\s*uuid\s*,\s*integer\s*,\s*text\s*\)/i
  );
  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function\s+public\.reissue_digital_access_token\s*\(\s*p_entitlement_id\s+uuid\s*,\s*p_expected_version\s+integer\s*\)/i
  );
  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function\s+public\.issue_digital_access_token_for_outbox\s*\([\s\S]*security\s+definer\s+set\s+search_path\s*=\s*''/i
  );
  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function\s+public\.authorize_digital_download\s*\([\s\S]*security\s+definer\s+set\s+search_path\s*=\s*''/i
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.issue_digital_access_token_for_outbox\s*\([^;]+\)\s+to\s+service_role/i
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.authorize_digital_download\s*\([^;]+\)\s+to\s+service_role/i
  );
  assert.doesNotMatch(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.(?:issue_digital_access_token_for_outbox|authorize_digital_download)\s*\([^;]+\)\s+to\s+(?:public|anon|authenticated)/i
  );
  assert.match(migration, /public\.checkout_orders/);
  assert.match(migration, /public\.digital_entitlements/);
  assert.match(migration, /public\.digital_access_tokens/);
  assert.match(migration, /public\.product_digital_assets/);
  assert.match(migration, /['"]entitlementVersion['"]/);
  assert.doesNotMatch(
    migration,
    /jsonb_build_object\s*\([^;]*(?:token_hash|guest_secret_hash|object_path|signed_url|service_role|provider_payload)/i
  );
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
  assert.match(pureService, /authorizeDigitalAsset/);
  assert.match(pureService, /SIGNED_URL_TTL_SECONDS = 300/);
  assert.doesNotMatch(
    pureService,
    /rawGuestToken|findActiveEntitlementsForOrder|isTokenUsable|isOwner/
  );
  assert.match(serverAdapter, /rpc\(['"]authorize_digital_download['"]/);
  assert.match(serverAdapter, /createSignedUrl/);
  assert.match(serverAdapter, /authorizeDownloadRequest/);
  assert.doesNotMatch(
    serverAdapter,
    /from\(['"](?:checkout_orders|digital_entitlements|digital_access_tokens|product_digital_assets)['"]\)|maybeSingle/
  );
  assert.match(route, /authorizeDownloadWithSupabase/);
  assert.match(route, /hashFulfillmentAccessToken/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /downloadTokenHash/);
  assert.match(route, /guestSecretHash/);
  assert.doesNotMatch(route, /rawGuestToken|guestTokenHash/);
  assert.doesNotMatch(route, /bucket_id|object_path|signed_url|pattern-pdfs/i);
});

test('transactional email worker keeps tokens and provider secrets out of durable payloads', () => {
  const source = readExisting(fulfillmentEmailFiles);
  const route = readFileSync('src/app/api/fulfillment/email-outbox/route.ts', 'utf8');
  const serverEnv = readFileSync('src/lib/env/server.ts', 'utf8');
  const tokenMigration = readFileSync(
    'supabase/migrations/20260812162048_transactional_email_retry_tokens.sql',
    'utf8'
  );

  assert.match(route, /authorization|x-worker-secret/i);
  assert.match(route, /transactionalEmailWorkerSecret/);
  assert.match(route, /tokenSecret:\s*env\.transactionalEmailTokenSecret/);
  assert.match(source, /tokenSecret:\s*env\.transactionalEmailTokenSecret/);
  assert.match(serverEnv, /TRANSACTIONAL_EMAIL_TOKEN_SECRET/);
  assert.doesNotMatch(serverEnv, /NEXT_PUBLIC_TRANSACTIONAL_EMAIL_TOKEN_SECRET/);
  assert.match(tokenMigration, /source_email_outbox_id/);
  assert.match(tokenMigration, /unique index/);
  const sanitizerPattern =
    /export function sanitizeEmailFailureCode[\s\S]*?(?=function isRecord)/;
  const sourceWithoutSanitizer = source.replace(
    sanitizerPattern,
    ''
  );

  assert.doesNotMatch(
    sourceWithoutSanitizer,
    /console\.(log|error|warn)|provider_payload|signed_url|signedUrl|object_path|pattern-pdfs/i
  );
  assert.doesNotMatch(source, /RESEND_API_KEY|TRANSACTIONAL_EMAIL_WORKER_SECRET/);
  assert.doesNotMatch(source, /attachments\s*:/i);
});

test('account purchase library delegates downloads through the app route without private storage details', () => {
  const source = readExisting(fulfillmentAccountFiles);

  assert.match(source, /\/api\/downloads/);
  assert.doesNotMatch(
    source,
    /createSignedUrl|signedUrl|token_hash|bucket_id|object_path|pattern-pdfs|SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
});

test('customer fulfillment tracking separates digital and physical state without admin-only leakage', () => {
  const source = readExisting(fulfillmentCustomerTrackingFiles);

  assert.match(source, /FulfillmentTrackSummary/);
  assert.match(source, /PhysicalTrackingPanel/);
  assert.match(source, /https:\/\//);
  assert.doesNotMatch(
    source,
    /admin_note|fulfillment_audit|provider_payload|raw_token|token_hash|object_path|pattern-pdfs|signedUrl|SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
});

test('admin physical fulfillment keeps tracking customer-safe and admin-only notes out of customer surfaces', () => {
  const source = readExisting(fulfillmentPhysicalFiles);
  const adapter = readFileSync('src/fulfillment/physical.ts', 'utf8');
  const migration = readExisting([
    'supabase/migrations/20260812171748_atomic_physical_fulfillment_email.sql'
  ]);

  assert.match(adapter, /rpc\(['"]update_physical_fulfillment['"]/);
  assert.doesNotMatch(
    adapter,
    /\.from\(['"](?:physical_fulfillments|physical_fulfillment_events|transactional_email_outbox)['"]\)/
  );
  assert.match(migration, /private\.is_admin\(\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /insert into public\.physical_fulfillment_events/);
  assert.match(migration, /insert into public\.transactional_email_outbox/);
  assert.match(
    migration,
    /grant execute on function public\.update_physical_fulfillment\(jsonb\) to authenticated/
  );
  assert.doesNotMatch(migration, /grant execute[^;]+\bto\s+(?:anon|public)\b/i);
  assert.match(source, /trackingUrl|tracking_url/);
  assert.doesNotMatch(source, /name=['"](?:recipientEmail|locale)['"]/);
  assert.doesNotMatch(
    source,
    /createSignedUrl|signedUrl|raw_token|token_hash|object_path|pattern-pdfs|SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
});

test('guest reopen and order claim keep token material out of UI and durable payloads', () => {
  const source = readExisting(fulfillmentGuestClaimFiles);

  assert.match(source, /guest_order_reopen/);
  assert.match(source, /guest_order_claim/);
  assert.match(source, /hashGuestOrderAccessToken/);
  assert.doesNotMatch(
    source,
    /console\.(log|error|warn)|rawToken.*payload|token_hash.*payload|signedUrl|object_path|pattern-pdfs|SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
});

test('public email requests use trusted HMAC identities and service-role-only atomic quota RPCs', () => {
  assert.ok(existsSync(publicEmailQuotaMigration), 'public email quota migration must exist');
  const migration = readFileSync(publicEmailQuotaMigration, 'utf8');
  const evidence = readFileSync('src/operations/public-request-evidence.ts', 'utf8');
  const newsletterAction = readFileSync('src/newsletter/actions.ts', 'utf8');
  const guestActions = readFileSync('src/fulfillment/guest-order-actions.ts', 'utf8');
  const guestRequests = readFileSync('src/fulfillment/order-claim.ts', 'utf8').slice(
    readFileSync('src/fulfillment/order-claim.ts', 'utf8').indexOf('export async function requestGuestOrderReopen'),
    readFileSync('src/fulfillment/order-claim.ts', 'utf8').indexOf('export async function claimGuestOrder')
  );

  assert.match(evidence, /createHmac\(['"]sha256['"],\s*secret\)/);
  assert.match(evidence, /public-email-rate-limit:v1:/);
  assert.doesNotMatch(evidence, /createHash\(|NEXT_PUBLIC_/);
  assert.match(newsletterAction, /createSupabaseAdminClient/);
  assert.match(guestActions, /createSupabaseAdminClient/);
  assert.match(newsletterAction + guestActions, /derivePublicEmailRequestEvidence/);
  assert.match(newsletterAction + guestActions, /x-forwarded-for|x-real-ip/i);
  assert.match(guestRequests, /rpc\(['"]request_guest_order_email['"]/);
  assert.doesNotMatch(
    guestRequests,
    /\.from\(['"](?:checkout_orders|transactional_email_outbox)['"]\)/
  );
  assert.match(
    migration,
    /create\s+table\s+private\.public_email_rate_limits[\s\S]*identity_hash[\s\S]*accepted_at/i
  );
  assert.doesNotMatch(
    migration.slice(
      migration.indexOf('create table private.public_email_rate_limits'),
      migration.indexOf(';', migration.indexOf('create table private.public_email_rate_limits'))
    ),
    /raw_ip|ip_address|email|order_number/i
  );
  for (const fn of ['subscribe_newsletter', 'request_guest_order_email']) {
    assert.match(
      migration,
      new RegExp(`create(?:\\s+or\\s+replace)?\\s+function\\s+public\\.${fn}[\\s\\S]*?security\\s+definer\\s+set\\s+search_path\\s*=\\s*''`, 'i')
    );
    assert.match(
      migration,
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^;]+\\)\\s+to\\s+service_role`, 'i')
    );
  }
  assert.doesNotMatch(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.(?:subscribe_newsletter|request_guest_order_email)\s*\([^;]+\)\s+to\s+(?:public|anon|authenticated)/i
  );
});

test('guest order reopen redemption only redirects and never returns order data as JSON', () => {
  const route = readFileSync('src/app/api/orders/access/route.ts', 'utf8');

  assert.match(route, /NextResponse\.redirect/);
  assert.match(route, /redeemGuestOrderReopenToken/);
  assert.match(route, /no-referrer/i);
  assert.doesNotMatch(route, /NextResponse\.json/);
  assert.doesNotMatch(route, /console\.(log|error|warn)/);
});

test('admin entitlement actions keep revoke and reissue behind safe RPC and UI boundaries', () => {
  const source = readExisting(fulfillmentAdminEntitlementFiles);

  assert.match(source, /revoke_digital_entitlement/);
  assert.match(source, /reissue_digital_access_token/);
  assert.match(source, /requireAdmin/);
  assert.doesNotMatch(
    source,
    /createSignedUrl|signedUrl|rawToken|object_path|pattern-pdfs|SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
});

test('transactional email capability issuance is one locked service-role-only RPC', () => {
  assert.ok(
    existsSync(transactionalEmailCapabilityMigration),
    'forward-only transactional email capability migration must exist'
  );
  const migration = readFileSync(transactionalEmailCapabilityMigration, 'utf8');
  const worker = readFileSync('src/fulfillment/email-outbox.server.ts', 'utf8');

  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function\s+public\.issue_transactional_email_capability_for_outbox\s*\([\s\S]*security\s+definer\s+set\s+search_path\s*=\s*''/i
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.issue_transactional_email_capability_for_outbox\s*\([^;]+\)\s+to\s+service_role/i
  );
  assert.doesNotMatch(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.issue_transactional_email_capability_for_outbox\s*\([^;]+\)\s+to\s+(?:public|anon|authenticated)/i
  );
  assert.match(worker, /rpc\(['"]issue_transactional_email_capability_for_outbox['"]/);
  assert.doesNotMatch(
    worker,
    /from\(['"](?:guest_order_access_tokens|newsletter_unsubscribe_tokens)['"]\)/
  );
  assert.doesNotMatch(migration, /raw_token|plain_token|token_secret/i);
});

test('download capability issuance and manual resend have one versioned database authority', () => {
  const worker = readFileSync('src/fulfillment/email-outbox.server.ts', 'utf8');
  const entitlements = readFileSync('src/fulfillment/entitlements.ts', 'utf8');
  const adminEntitlements = readFileSync('src/fulfillment/admin-entitlement-actions.ts', 'utf8');
  const adminEmails = readFileSync('src/fulfillment/admin-email-actions.ts', 'utf8');
  const resendOnly = adminEmails.slice(
    adminEmails.indexOf('export async function resendDownloadEmailAction')
  );
  const recoveryUi = readFileSync(
    'src/components/admin/fulfillment/email-recovery-actions.tsx',
    'utf8'
  );

  assert.match(worker, /issue_digital_access_token_for_outbox/);
  assert.doesNotMatch(worker, /from\(['"]digital_access_tokens['"]\)/);
  assert.doesNotMatch(entitlements, /p_new_token_hash|randomUUID|newSecretMaterial/);
  assert.match(adminEntitlements, /createSupabaseServerClient/);
  assert.doesNotMatch(adminEntitlements, /createSupabaseAdminClient/);
  assert.match(resendOnly, /reissueDigitalEntitlement/);
  assert.match(resendOnly, /createSupabaseServerClient/);
  assert.doesNotMatch(
    resendOnly,
    /from\(['"](?:transactional_email_outbox|fulfillment_audit_events)['"]\)/
  );
  assert.match(recoveryUi, /name=['"]expectedVersion['"]/);
});

test('admin email recovery uses versioned atomic RPCs and trusts no browser commerce identity', () => {
  assert.ok(existsSync(adminEmailRecoveryMigration), 'atomic admin recovery migration must exist');
  const migration = readFileSync(adminEmailRecoveryMigration, 'utf8');
  const actions = readFileSync('src/fulfillment/admin-email-actions.ts', 'utf8');
  const retryOnly = actions.slice(
    actions.indexOf('export async function retryTransactionalEmailAction'),
    actions.indexOf('export async function resendDownloadEmailAction')
  );
  const resendOnly = actions.slice(
    actions.indexOf('export async function resendDownloadEmailAction')
  );

  assert.match(migration, /create\s+function\s+public\.admin_retry_transactional_email[\s\S]*for\s+update/i);
  assert.match(migration, /p_expected_version\s+integer/i);
  assert.match(retryOnly, /rpc\(['"]admin_retry_transactional_email['"]/);
  assert.doesNotMatch(retryOnly, /\.from\(['"]transactional_email_outbox['"]\)/);
  assert.doesNotMatch(
    resendOnly,
    /getFormString\(formData,\s*['"](?:orderId|orderNumber|recipientEmail)['"]\)/
  );
  assert.match(migration, /checkout\.paid_gate_status\s*=\s*'open'/i);
  assert.match(migration, /insert\s+into\s+public\.fulfillment_audit_events/i);
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
