import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const contractPath = 'src/newsletter/unsubscribe-token.ts';
const consentPath = 'src/newsletter/consent.ts';
const workerPath = 'src/fulfillment/email-outbox.ts';
const repositoryPath = 'src/fulfillment/email-outbox.server.ts';
const rendererPath = 'src/emails/transactional.ts';
const pagePath = 'src/app/[locale]/newsletter/unsubscribe/page.tsx';
const retentionMigrationPath =
  'supabase/migrations/20260620102618_customer_retention_trust.sql';

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source boundary: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source boundary: ${endMarker}`);
  return source.slice(start, end);
}

test('newsletter token has one exact server-only base64url-43 contract', () => {
  assert.ok(existsSync(contractPath), 'dedicated newsletter token contract must exist');
  const contract = readFileSync(contractPath, 'utf8');

  assert.match(contract, /import ['"]server-only['"]/);
  assert.match(contract, /NewsletterUnsubscribeToken/);
  assert.match(contract, /\^\[A-Za-z0-9_-\]\{43\}\$/);
  assert.match(contract, /normalizeNewsletterUnsubscribeToken/);
  assert.match(contract, /hashNewsletterUnsubscribeToken/);
  assert.doesNotMatch(contract, /\.trim\(|randomBytes|\[a-f0-9\]\{64\}/);
});

test('derivation, rendering, persistence, and redemption consume the shared contract', () => {
  const consumers = [workerPath, rendererPath, repositoryPath, consentPath];

  for (const file of consumers) {
    const source = readFileSync(file, 'utf8');
    assert.match(
      source,
      /from ['"]@\/newsletter\/unsubscribe-token['"]/,
      `${file} must import the shared newsletter token contract`
    );
    assert.match(
      source,
      /normalizeNewsletterUnsubscribeToken/,
      `${file} must validate at its own boundary`
    );
  }
});

test('newsletter derivation and rendering fail closed before delivery output', () => {
  const worker = readFileSync(workerPath, 'utf8');
  const renderer = readFileSync(rendererPath, 'utf8');
  const derivation = sourceBlock(
    worker,
    'export function deriveTransactionalEmailToken',
    'export type ClaimedTransactionalEmailRow'
  );
  const newsletterRender = sourceBlock(
    renderer,
    "if (row.eventType === 'newsletter_subscribed')",
    "if (row.eventType === 'digital_access_granted'"
  );

  assert.match(
    derivation,
    /purpose === ['"]newsletter_unsubscribe['"][\s\S]*normalizeNewsletterUnsubscribeToken/
  );
  assert.match(newsletterRender, /normalizeNewsletterUnsubscribeToken\(context\.newsletterToken\)/);
  assert.match(newsletterRender, /newsletterUnsubscribePath\(locale,\s*newsletterToken\)/);
  assert.doesNotMatch(newsletterRender, /newsletterUnsubscribePath\(locale,\s*context\.newsletterToken\)/);
});

test('newsletter persistence validates transient material then stores source-linked hash-only metadata', () => {
  const repository = readFileSync(repositoryPath, 'utf8');
  const issuance = sourceBlock(
    repository,
    'async issueNewsletterToken',
    'async markSent'
  );
  const durableInsert = sourceBlock(issuance, 'insert: {', '      });');

  assert.match(issuance, /normalizeNewsletterUnsubscribeToken\(preparation\.rawToken\)/);
  assert.match(issuance, /hashNewsletterUnsubscribeToken\(/);
  assert.match(durableInsert, /normalized_email/);
  assert.match(durableInsert, /token_hash/);
  assert.match(durableInsert, /expires_at/);
  assert.match(durableInsert, /source_email_outbox_id/);
  assert.doesNotMatch(durableInsert, /rawToken|raw_token|newsletterToken|newsletter_token/);
});

test('newsletter redemption validates before hashing and sends only lowercase SHA-256 hex to RPC', () => {
  const consent = readFileSync(consentPath, 'utf8');
  const redemption = consent.slice(consent.indexOf('export async function unsubscribeNewsletter'));
  const rpcCall = sourceBlock(
    redemption,
    "client.rpc('unsubscribe_newsletter'",
    '  if (error || !isRecord(data))'
  );

  assert.match(redemption, /normalizeNewsletterUnsubscribeToken\(rawToken\)/);
  assert.match(redemption, /hashNewsletterUnsubscribeToken\(/);
  assert.match(rpcCall, /p_token_hash/);
  assert.doesNotMatch(rpcCall, /p_(?:raw_)?token\s*:|rawToken/);
  assert.doesNotMatch(redemption, /return\s+\{[^}]*token/i);
});

test('monitoring, page results, and durable outbox payloads remain token-free', () => {
  const consent = readFileSync(consentPath, 'utf8');
  const page = readFileSync(pagePath, 'utf8');
  const migration = readFileSync(retentionMigrationPath, 'utf8');
  const failureRecorder = sourceBlock(
    consent,
    'async function recordNewsletterFailure',
    'export async function subscribeNewsletter'
  );
  const subscribeRpc = sourceBlock(
    migration,
    'create or replace function public.subscribe_newsletter',
    'revoke all on function public.subscribe_newsletter'
  );
  const outboxInsert = sourceBlock(
    subscribeRpc,
    'insert into public.transactional_email_outbox',
    '  return jsonb_build_object('
  );

  assert.doesNotMatch(failureRecorder, /rawToken|token_hash|newsletterToken|console\.(?:log|error|warn)/);
  assert.doesNotMatch(page, /<UnsubscribeResult[\s\S]*\btoken=/);
  assert.doesNotMatch(outboxInsert, /rawToken|raw_token|token_hash|newsletterToken|newsletter_token/);
});
