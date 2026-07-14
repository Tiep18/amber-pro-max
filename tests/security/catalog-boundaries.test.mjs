import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const publicFiles = [
  'src/app/[locale]/product/[productSlug]/page.tsx',
  'src/components/catalog/product-gallery.tsx',
  'src/components/catalog/unavailable-market.tsx'
];

const privatePdfBoundaries = [
  /product_digital_assets/i,
  /pattern-pdfs/i,
  /(?:pdf|digital[\s_-]?asset)[\s_-]?(?:object[\s_-]?)?path/i,
  /createSignedUrl|signedUrl/i,
  /entitlement/i,
  /download email|downloadRoute|api\/download|download\/route/i
];

function matchesPrivatePdfBoundary(source) {
  return privatePdfBoundaries.some((pattern) => pattern.test(source));
}

test('private PDF boundary patterns allow public media paths and reject fulfillment identifiers', () => {
  const publicMediaFixture =
    "supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(media.object_path)";
  const privatePdfFixtures = [
    "supabase.from('product_digital_assets').select('object_path')",
    "supabase.storage.from('pattern-pdfs')",
    'const pdfObjectPath = asset.object_path',
    'const digital_asset_path = row.object_path',
    'storage.createSignedUrl(objectPath, 60)',
    "supabase.from('digital_entitlements')",
    'const hasEntitlement = await verifyPurchase()',
    "fetch('/api/download/token')"
  ];

  assert.equal(matchesPrivatePdfBoundary(publicMediaFixture), false);
  for (const fixture of privatePdfFixtures) {
    assert.equal(matchesPrivatePdfBoundary(fixture), true, `expected private fixture: ${fixture}`);
  }
});

test('public catalog has no pre-payment digital fulfillment path', () => {
  const source = publicFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

  for (const boundary of privatePdfBoundaries) {
    assert.doesNotMatch(source, boundary);
  }
});
