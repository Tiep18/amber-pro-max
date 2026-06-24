import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const operationsFiles = [
  'src/operations/redaction.ts',
  'src/operations/errors.ts',
  'src/operations/admin-queries.ts',
  'src/app/admin/operations/page.tsx',
  'src/components/admin/operations/error-queue.tsx',
  'src/components/admin/operations/mark-error-resolved-button.tsx'
];

const operationsUiFiles = [
  'src/app/admin/operations/page.tsx',
  'src/components/admin/operations/error-queue.tsx',
  'src/components/admin/operations/mark-error-resolved-button.tsx'
];

function readExisting(files) {
  return files
    .filter((file) => existsSync(file))
    .map((file) => `\n/* ${file} */\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

test('Phase 7 operations contract files exist', () => {
  assert.deepEqual(
    operationsFiles.filter((file) => !existsSync(file)),
    []
  );
});

test('ADM-01 OPS-03 D-11 admin operations inspection requires authorization before reads or resolves', () => {
  const source = readExisting(operationsFiles);

  assert.match(source, /requireAdmin/);
  assert.match(source, /getAdminOperationalErrors/);
  assert.match(source, /markOperationalErrorResolved/);
});

test('OPS-03 D-11 operations UI never renders raw operational evidence fields', () => {
  const source = readExisting(operationsUiFiles);

  assert.doesNotMatch(source, /raw_payload|rawPayload|authorizationHeader|providerSignature|accessToken|tokenHash|signedUrl|stackTrace/i);
  assert.doesNotMatch(source, /customerEmail|shippingAddress|phoneNumber/i);
});

test('OPS-03 D-11 operations redaction drops unsafe fact keys and values before storage', () => {
  const source = readFileSync('src/operations/redaction.ts', 'utf8');

  assert.match(source, /sanitizeOperationalErrorInput/);
  assert.match(source, /allowedFactKeys/);
  assert.match(source, /unsafeKeyPattern/);
  assert.match(source, /emailPattern/);
});

test('safe admin redirects allow operations inspection and no nested raw-log route', () => {
  const source = readFileSync('src/auth/redirect.ts', 'utf8');

  assert.match(source, /\/admin\/operations/);
  assert.doesNotMatch(source, /\/admin\/operations\/(?:raw|payload|secret|token|download)/i);
});
