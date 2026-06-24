import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

test('sitemaps are generated from public projections, not filesystem route walking', () => {
  const source = read('src/app/sitemaps/[locale]/route.ts');

  assert.match(source, /listCatalogProducts/);
  assert.match(source, /listPublishedBlogPosts/);
  assert.match(source, /getPublishedRequiredPolicyLinks/);
  assert.doesNotMatch(source, /readdir|glob|admin|operations|download/i);
});

test('robots excludes private checkout, account, API, and admin surfaces', () => {
  const source = read('src/app/robots.ts');

  assert.match(source, /\/admin/);
  assert.match(source, /\/api/);
  assert.match(source, /\/checkout/);
  assert.match(source, /\/account/);
});
