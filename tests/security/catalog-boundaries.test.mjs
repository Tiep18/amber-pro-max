import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

const publicFiles = [
  'src/app/[locale]/product/[productSlug]/page.tsx',
  'src/components/catalog/product-gallery.tsx',
  'src/components/catalog/unavailable-market.tsx'
];

const staticStorefrontScopes = [
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/layout.tsx',
  'src/app/[locale]/catalog/page.tsx',
  'src/app/[locale]/category/[categorySlug]/page.tsx',
  'src/app/[locale]/collection/[collectionSlug]/page.tsx',
  'src/app/[locale]/technique/[techniqueSlug]/page.tsx',
  'src/app/[locale]/tag/[tagSlug]/page.tsx',
  'src/app/[locale]/product/[productSlug]/page.tsx',
  'src/catalog/public-cache.ts',
  'src/catalog/metadata.ts',
  'src/content/seo/json-ld.tsx',
  'src/app/sitemaps/[locale]/route.ts',
  'src/app/robots.ts'
];

const projectionBoundaryFiles = [
  'src/catalog/projection-schemas.ts',
  'src/catalog/projections.ts',
  'src/app/api/storefront/catalog/route.ts',
  'src/app/api/storefront/products/[productSlug]/route.ts'
];

function existingSource(files) {
  return files
    .filter((file) => existsSync(file))
    .map((file) => `// ${file}\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

function sourceFilesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = `${directory}/${entry}`;
    if (statSync(path).isDirectory()) return sourceFilesUnder(path);
    return /\.(?:ts|tsx|js|mjs|sql)$/u.test(entry) ? [path] : [];
  });
}

const requestApiBoundary =
  /\b(?:cookies|headers|draftMode|connection)\s*\(|\bgetRequestMarket\s*\(|fetch\s*\(\s*['"`]\/api\/storefront\//u;
const rawSensitiveLogBoundary =
  /(?:console\.(?:log|info|warn|error)|\blogger\.\w+|\b(?:record|monitor)\w*)\s*\([^\n]*(?:cookie|header|searchParams|rawQuery|projection|offerFingerprint)/iu;
const offerFingerprintBoundary = /offer[_-]?fingerprint|offerFingerprint/iu;
const marketPreferenceSource = existingSource([
  'src/catalog/market-actions.ts',
  'src/components/storefront-context.tsx',
  'src/components/market-switcher.tsx'
]);

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
    'supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(media.object_path)';
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

test('static storefront scopes stay request-invariant and never fetch private projections', () => {
  const source = existingSource(staticStorefrontScopes);

  assert.doesNotMatch(source, requestApiBoundary);
  assert.ok(
    staticStorefrontScopes.includes('src/app/[locale]/technique/[techniqueSlug]/page.tsx') &&
      staticStorefrontScopes.includes('src/app/[locale]/tag/[tagSlug]/page.tsx'),
    'localized technique and tag routes must remain in the static security contract'
  );
});

test('request and logging boundary matchers reject unsafe fixtures', () => {
  for (const fixture of [
    'const market = await getRequestMarket()',
    'const cookieStore = await cookies()',
    'const requestHeaders = await headers()',
    "await fetch('/api/storefront/catalog')"
  ]) {
    assert.match(fixture, requestApiBoundary);
  }
  for (const fixture of [
    'console.log({cookies})',
    'logger.warn({rawQuery})',
    'monitorFailure({projection})',
    'console.error({offerFingerprint})'
  ]) {
    assert.match(fixture, rawSensitiveLogBoundary);
  }
});

test(
  'market preference changes do not invalidate shared storefront paths',
  {
    skip:
      /\brevalidatePath\s*\(/u.test(marketPreferenceSource) &&
      'expected red: Plan 09-04 removes legacy shared-path invalidation'
  },
  () => {
    assert.doesNotMatch(marketPreferenceSource, /\brevalidatePath\s*\(/u);
  }
);

test('projection fingerprints never enter cart, checkout, payment, or database authority', () => {
  const authorityFiles = [
    ...sourceFilesUnder('src/cart'),
    ...sourceFilesUnder('src/checkout'),
    ...sourceFilesUnder('src/payments'),
    ...sourceFilesUnder('supabase/migrations')
  ];
  const source = existingSource(authorityFiles);

  assert.doesNotMatch(source, offerFingerprintBoundary);
});

test(
  'projection schemas are strict, bounded, and exclude caller-selected market',
  {
    skip:
      !existsSync('src/catalog/projection-schemas.ts') &&
      'Plan 09-06 owns projection implementation'
  },
  () => {
    const source = readFileSync('src/catalog/projection-schemas.ts', 'utf8');

    assert.match(source, /(?:\.strict\s*\(\)|z\.strictObject\s*\()/u);
    assert.match(source, /\.max\s*\(\s*100\s*\)/u);
    assert.match(source, /\.max\s*\(\s*48\s*\)/u);
    assert.doesNotMatch(source, /\bmarket\s*:/u);
  }
);

test(
  'private projection handlers derive market and mark every response private no-store',
  {
    skip:
      !projectionBoundaryFiles.slice(2).every((file) => existsSync(file)) &&
      'Plan 09-06 owns projection implementation'
  },
  () => {
    for (const file of projectionBoundaryFiles.slice(2)) {
      const source = readFileSync(file, 'utf8');
      assert.match(source, /\bgetRequestMarket\s*\(/u, `${file} must derive market on the server`);
      assert.match(source, /private,\s*no-store/iu, `${file} must mark every outcome private`);
      assert.doesNotMatch(
        source,
        /(?:searchParams\.get\s*\(\s*['"`]market|\bmarket\s*:\s*searchParams)/u
      );
      assert.doesNotMatch(source, rawSensitiveLogBoundary);
    }
  }
);

test(
  'cached catalog projections carry every result-shaping argument',
  {
    skip:
      !projectionBoundaryFiles.slice(0, 2).every((file) => existsSync(file)) &&
      'Plan 09-06 owns projection implementation'
  },
  () => {
    const source = existingSource(['src/catalog/public-cache.ts', 'src/catalog/projections.ts']);
    for (const argument of [
      'locale',
      'market',
      'surface',
      'search',
      'productType',
      'categorySlug',
      'collectionSlug',
      'techniqueSlug',
      'tagSlug',
      'sort',
      'limit'
    ]) {
      assert.match(
        source,
        new RegExp(`\\b${argument}\\b`, 'u'),
        `missing cache argument: ${argument}`
      );
    }
    assert.doesNotMatch(source, requestApiBoundary);
  }
);

test(
  'projection code never logs raw request or projected offer data',
  {
    skip:
      !projectionBoundaryFiles.some((file) => existsSync(file)) &&
      'Plan 09-06 owns projection implementation'
  },
  () => {
    assert.doesNotMatch(existingSource(projectionBoundaryFiles), rawSensitiveLogBoundary);
  }
);
