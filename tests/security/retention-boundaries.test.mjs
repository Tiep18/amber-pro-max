import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const adminNewsletterFiles = [
  'src/newsletter/admin-queries.ts',
  'src/app/admin/newsletter/page.tsx',
  'src/components/admin/newsletter/subscriber-list.tsx'
];

const adminNewsletterUiFiles = [
  'src/app/admin/newsletter/page.tsx',
  'src/components/admin/newsletter/subscriber-list.tsx'
];

function readExisting(files) {
  return files
    .filter((file) => existsSync(file))
    .map((file) => `\n/* ${file} */\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

test('Phase 6 newsletter admin contract files exist', () => {
  assert.deepEqual(
    adminNewsletterFiles.filter((file) => !existsSync(file)),
    []
  );
});

test('admin newsletter inspection requires admin authorization before reads', () => {
  const source = readExisting(adminNewsletterFiles);

  assert.match(source, /requireAdmin/);
  assert.match(source, /getAdminNewsletterSubscribers/);
});

test('admin newsletter surface is read-only and exposes no consent override controls', () => {
  const source = readExisting(adminNewsletterUiFiles);

  assert.doesNotMatch(source, /subscribeNewsletterAction|unsubscribeNewsletter|subscribeCustomer|unsubscribeCustomer/i);
  assert.doesNotMatch(source, /formAction=.*subscribe|formAction=.*unsubscribe|button[^>]*(subscribe|unsubscribe)/i);
});

test('admin newsletter UI never renders raw request or token material', () => {
  const source = readExisting(adminNewsletterUiFiles);

  assert.doesNotMatch(source, /raw_ip|rawIp|ip_hash|user_agent_hash|token_hash|rawToken|newsletter_unsubscribe_tokens/i);
  assert.doesNotMatch(source, /[a-f0-9]\{64\}/i);
});

test('safe admin redirects allow newsletter inspection and reject nested override routes', () => {
  const source = readFileSync('src/auth/redirect.ts', 'utf8');

  assert.match(source, /\/admin\/newsletter/);
  assert.doesNotMatch(source, /\/admin\/newsletter\/(?:subscribe|unsubscribe)/i);
});
