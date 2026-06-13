import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const publicFiles = [
  'src/app/[locale]/product/[productSlug]/page.tsx',
  'src/components/catalog/product-gallery.tsx',
  'src/components/catalog/unavailable-market.tsx'
];

test('public catalog has no pre-payment digital fulfillment path', () => {
  const source = publicFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

  assert.doesNotMatch(source, /createSignedUrl|signedUrl|entitlement|download email/i);
  assert.doesNotMatch(source, /product_digital_assets|pattern-pdfs|object_path/i);
  assert.doesNotMatch(source, /api\/download|download\/route/i);
});
