import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

test('SEO-02 SEO-04 D-08 sitemaps use public projections instead of filesystem route walking', () => {
  const source = read('src/app/sitemaps/[locale]/route.ts');

  assert.match(source, /(?:getCachedCatalogProducts|listCatalogProducts)/);
  assert.match(source, /(?:getCachedPublishedBlogPosts|listPublishedBlogPosts)/);
  assert.match(source, /getPublishedRequiredPolicyLinks/);
  assert.doesNotMatch(source, /readdir|glob|admin|operations|download/i);
});

test('SEO-04 D-08 robots excludes private checkout, account, API, and admin surfaces', () => {
  const source = read('src/app/robots.ts');

  assert.match(source, /\/admin/);
  assert.match(source, /\/api/);
  assert.match(source, /\/checkout/);
  assert.match(source, /\/account/);
});

test('review eligibility stays private without making the ISR product page user-specific', () => {
  const route = read('src/app/api/reviews/eligibility/route.ts');
  const productPage = read('src/app/[locale]/product/[productSlug]/page.tsx');

  assert.match(route, /dynamic\s*=\s*['"]force-dynamic['"]/);
  assert.match(route, /Cache-Control['"]:\s*['"]private,\s*no-store['"]/);
  assert.match(route, /Vary:\s*['"]Cookie['"]/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /canReviewProduct/);

  assert.match(productPage, /revalidate\s*=\s*300/);
  assert.match(productPage, /dynamic\s*=\s*['"]force-static['"]/);
  assert.match(productPage, /<ReviewFormGate/);
  assert.doesNotMatch(productPage, /requireUser|canReviewProduct/);
});
