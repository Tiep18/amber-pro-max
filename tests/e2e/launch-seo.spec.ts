import { spawnSync } from 'node:child_process';
import { request as apiRequest, type APIResponse } from '@playwright/test';
import { expect, MARKET_COOKIE, STOREFRONT_ORIGIN, test } from './fixtures/storefront-market';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleEnvKey = 'SUPABASE_' + 'SERVICE' + '_ROLE_KEY';
const secretEnvKey = 'SUPABASE_' + 'SECRET' + '_KEY';
const techniqueId = '59100000-0000-0000-0000-000000000001';
const tagId = '59100000-0000-0000-0000-000000000002';

function localSupabaseSecret() {
  const configured = process.env[serviceRoleEnvKey] ?? process.env[secretEnvKey];
  if (configured) return configured;
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost):/.test(supabaseUrl)) {
    throw new Error(`${secretEnvKey} is required for non-local SEO fixtures`);
  }

  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'supabase status -o env'], {
          encoding: 'utf8'
        })
      : spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
  const secret = result.stdout.match(/^SECRET_KEY="?([^"\r\n]+)"?$/m)?.[1];
  if (!secret) {
    throw new Error('Local Supabase secret is unavailable; start the local test stack first');
  }
  return secret;
}

const serviceRoleKey = localSupabaseSecret();
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders, ...init?.headers }
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

test.beforeAll(async () => {
  await rest('techniques', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: techniqueId })
  });
  await rest('technique_translations', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([
      { technique_id: techniqueId, locale: 'vi', name: 'Ky thuat SEO' },
      { technique_id: techniqueId, locale: 'en', name: 'SEO technique' }
    ])
  });
  await rest('product_techniques', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      product_id: '50000000-0000-0000-0000-000000000001',
      technique_id: techniqueId
    })
  });
  await rest('tags', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: tagId })
  });
  await rest('tag_translations', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([
      { tag_id: tagId, locale: 'vi', name: 'The SEO' },
      { tag_id: tagId, locale: 'en', name: 'SEO tag' }
    ])
  });
  await rest('product_tags', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      product_id: '50000000-0000-0000-0000-000000000002',
      tag_id: tagId
    })
  });
});

test.afterAll(async () => {
  await rest(`product_techniques?technique_id=eq.${techniqueId}`, { method: 'DELETE' });
  await rest(`product_tags?tag_id=eq.${tagId}`, { method: 'DELETE' });
  await rest(`techniques?id=eq.${techniqueId}`, { method: 'DELETE' });
  await rest(`tags?id=eq.${tagId}`, { method: 'DELETE' });
});

export const PUBLIC_VARIANTS = [
  { name: 'no-cookie-vn-geo', cookie: null, geo: 'VN' },
  { name: 'no-cookie-us-geo', cookie: null, geo: 'US' },
  { name: 'vn-cookie-vn-geo', cookie: 'vn', geo: 'VN' },
  { name: 'vn-cookie-us-geo', cookie: 'vn', geo: 'US' },
  { name: 'intl-cookie-vn-geo', cookie: 'intl', geo: 'VN' },
  { name: 'intl-cookie-us-geo', cookie: 'intl', geo: 'US' },
  { name: 'invalid-cookie-vn-geo', cookie: 'forged-market', geo: 'VN' },
  { name: 'invalid-cookie-us-geo', cookie: 'forged-market', geo: 'US' }
] as const;

const PUBLIC_HTML_SURFACES = [
  '/en',
  '/vi',
  '/en/catalog',
  '/vi/cua-hang',
  '/en/category/stuffed-animals',
  '/vi/danh-muc/gau-bong',
  '/en/collection/gifts',
  '/vi/bo-suu-tap/qua-tang',
  `/en/technique/${techniqueId}`,
  `/vi/ky-thuat/${techniqueId}`,
  `/en/tag/${tagId}`,
  `/vi/the/${tagId}`,
  '/en/product/intl-bear',
  '/vi/san-pham/gau-quoc-te'
] as const;

const PUBLIC_TEXT_SURFACES = [
  '/sitemap.xml',
  '/sitemaps/en',
  '/sitemaps/vi',
  '/robots.txt'
] as const;

export function normalizePublicHtml(html: string) {
  const buildScripts: string[] = [];
  const normalized = html
    .replace(/\snonce="[^"]*"/g, ' nonce="<build-nonce>"')
    .replace(
      /<script id="_R_">self\.__next_r="[^"]+"<\/script>/g,
      '<script id="_R_">self.__next_r="<build-nonce>"</script>'
    )
    .replace(/<script\b[^>]*\bsrc="[^"]*\/_next\/static\/[^"]*"[^>]*><\/script>/g, (script) => {
      buildScripts.push(script.replace(/\snonce="[^"]*"/g, ' nonce="<build-nonce>"'));
      return '<!-- next-build-script -->';
    })
    .replace(
      /<script(?![^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/g,
      '<!-- next-runtime-script -->'
    );
  return `${normalized}\n<!-- sorted-next-build-scripts:${buildScripts.sort().join('')} -->`;
}

async function publicResponse(path: string, variant: (typeof PUBLIC_VARIANTS)[number]) {
  const context = await apiRequest.newContext({
    baseURL: STOREFRONT_ORIGIN,
    userAgent: 'Phase-09-SEO-invariance-probe',
    extraHTTPHeaders: {
      'Accept-Language': path.startsWith('/vi') ? 'vi-VN,vi;q=0.9' : 'en-US,en;q=0.9',
      Cookie: variant.cookie ? `${MARKET_COOKIE}=${variant.cookie}` : '',
      'x-vercel-ip-country': variant.geo
    }
  });
  try {
    const response = await context.get(path);
    return { status: response.status(), body: await response.text() };
  } finally {
    await context.dispose();
  }
}

function expectIndexableSeo(body: string, path: string) {
  expect(body, `${path} heading`).toMatch(/<h1(?:\s|>)/);
  expect(body, `${path} canonical`).toMatch(/<link rel="canonical" href="[^"]+"/);
  expect(body, `${path} vi alternate`).toMatch(/<link rel="alternate" hrefLang="vi" href="[^"]+"/i);
  expect(body, `${path} en alternate`).toMatch(/<link rel="alternate" hrefLang="en" href="[^"]+"/i);
  expect(body, `${path} JSON-LD`).toContain('application/ld+json');
  expect(body, `${path} market URL`).not.toMatch(
    /[?&](?:market|ACTIVE_MARKET)=|\/(?:vn|intl)(?:\/|["'<])/
  );
}

async function expectApiPrivateNoStore(response: APIResponse, label: string) {
  expect(response.headers()['cache-control'], label).toBe('private, no-store');
}

test('SEO-02 SEO-03 D-07 D-08 D-24 public HTML and SEO are cookie/IP invariant', async () => {
  test.setTimeout(240_000);

  for (const path of [...PUBLIC_HTML_SURFACES, ...PUBLIC_TEXT_SURFACES]) {
    await publicResponse(path, PUBLIC_VARIANTS[0]);
    const variants = [];
    for (const variant of PUBLIC_VARIANTS) {
      variants.push({
        name: variant.name,
        ...(await publicResponse(path, variant))
      });
    }
    for (const variant of variants) {
      expect(variant.status, `${path} ${variant.name}`).toBe(200);
    }
    const normalized = variants.map(({ body }) => normalizePublicHtml(body));
    const reference = normalized[0]!;
    const mismatchIndex = normalized.findIndex((body) => body !== reference);
    if (mismatchIndex !== -1) {
      const mismatch = normalized[mismatchIndex]!;
      let character = 0;
      while (reference[character] === mismatch[character]) character += 1;
      expect(
        mismatch,
        `${path} ${variants[mismatchIndex]!.name} varied at character ${character}: ` +
          `${JSON.stringify(reference.slice(character, character + 240))} versus ` +
          `${JSON.stringify(mismatch.slice(character, character + 240))}`
      ).toBe(reference);
    }
    if ((PUBLIC_HTML_SURFACES as readonly string[]).includes(path)) {
      expectIndexableSeo(variants[0]!.body, path);
    } else {
      expect(variants[0]!.body, `${path} private URL`).not.toMatch(
        /\/(?:api|admin|checkout|account|auth)(?:\/|<)|[?&](?:market|ACTIVE_MARKET)=/i
      );
    }
  }
});

test('private catalog and product projections vary by market and are never publicly cacheable', async ({
  storefrontMarket
}) => {
  test.setTimeout(60_000);
  const [vn, intl] = await Promise.all([
    storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' }),
    storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' })
  ]);
  const projectionPath = '/api/storefront/catalog?locale=en&surface=catalog&sort=newest&limit=24';
  const [vnCatalog, intlCatalog, invalidCatalog, readyProduct, missingProduct] = await Promise.all([
    vn.context.request.get(projectionPath),
    intl.context.request.get(projectionPath),
    intl.context.request.get(`${projectionPath}&market=vn`),
    intl.context.request.get('/api/storefront/products/intl-bear?locale=en'),
    intl.context.request.get('/api/storefront/products/missing-product?locale=en')
  ]);

  for (const [label, response] of [
    ['vn catalog', vnCatalog],
    ['intl catalog', intlCatalog],
    ['invalid catalog', invalidCatalog],
    ['ready product', readyProduct],
    ['missing product', missingProduct]
  ] as const) {
    await expectApiPrivateNoStore(response, label);
  }
  expect(vnCatalog.status()).toBe(200);
  expect(intlCatalog.status()).toBe(200);
  expect(invalidCatalog.status()).toBe(400);
  expect(await invalidCatalog.json()).toMatchObject({
    status: 'error',
    code: 'invalid_catalog_projection'
  });
  expect(missingProduct.status()).toBe(404);
  expect(await missingProduct.json()).toMatchObject({
    status: 'error',
    code: 'product_not_found'
  });

  const vnProjection = await vnCatalog.json();
  const intlProjection = await intlCatalog.json();
  expect(vnProjection).not.toEqual(intlProjection);
  expect(vnProjection.projection.market).toBe('vn');
  expect(intlProjection.projection.market).toBe('intl');

  await vn.page.goto('/en/catalog');
  await intl.page.goto('/en/catalog');
  const vnGrid = vn.page.getByTestId('catalog-product-grid');
  const intlGrid = intl.page.getByTestId('catalog-product-grid');
  await expect(vnGrid).toContainText(/₫|VND/, { timeout: 15_000 });
  await expect(intlGrid).toContainText(/\$|USD/, { timeout: 15_000 });
  expect(await vnGrid.textContent()).not.toBe(await intlGrid.textContent());
});

test('SEO-02 SEO-03 D-05 D-06 D-08 product page emits localized metadata and safe JSON-LD', async ({
  page
}) => {
  await page.goto('/en/product/intl-bear');

  await expect(page).toHaveTitle('International bear');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/en/product/intl-bear'
  );
  await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/vi/san-pham/gau-quoc-te'
  );

  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const structured = scripts.map((script) => JSON.parse(script)) as Array<
    Record<string, unknown> | Array<Record<string, unknown>>
  >;
  const flattened = structured.flat();

  expect(
    flattened.some((entry) => entry['@type'] === 'Product' && entry.name === 'International bear')
  ).toBe(true);
  expect(flattened.some((entry) => entry['@type'] === 'BreadcrumbList')).toBe(true);
  expect(JSON.stringify(flattened)).not.toMatch(/admin|download-token|secret|signature/i);
});
