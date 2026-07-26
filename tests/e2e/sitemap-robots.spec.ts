import {expect, test} from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlLWRlbW8iLCJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjoxOTgzODEyOTk2fQ.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};
const techniqueId = '59000000-0000-0000-0000-000000000001';
const tagId = '59000000-0000-0000-0000-000000000002';

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {...serviceHeaders, ...init?.headers}
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

test.beforeAll(async () => {
  await rest('techniques', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify({id: techniqueId})
  });
  await rest('technique_translations', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify([
      {technique_id: techniqueId, locale: 'vi', name: 'Ky thuat sitemap'},
      {technique_id: techniqueId, locale: 'en', name: 'Sitemap technique'}
    ])
  });
  await rest('product_techniques', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify({
      product_id: '50000000-0000-0000-0000-000000000001',
      technique_id: techniqueId
    })
  });

  await rest('tags', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify({id: tagId})
  });
  await rest('tag_translations', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify([
      {tag_id: tagId, locale: 'vi', name: 'The sitemap'},
      {tag_id: tagId, locale: 'en', name: 'Sitemap tag'}
    ])
  });
  await rest('product_tags', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates'},
    body: JSON.stringify({
      product_id: '50000000-0000-0000-0000-000000000002',
      tag_id: tagId
    })
  });
});

test.afterAll(async () => {
  await rest(`product_techniques?technique_id=eq.${techniqueId}`, {method: 'DELETE'});
  await rest(`product_tags?tag_id=eq.${tagId}`, {method: 'DELETE'});
  await rest(`techniques?id=eq.${techniqueId}`, {method: 'DELETE'});
  await rest(`tags?id=eq.${tagId}`, {method: 'DELETE'});
});

test('SEO-02 SEO-04 D-05 D-07 sitemap index points to localized public sitemaps only', async ({page}) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.headers()['content-type']).toContain('application/xml');
  const body = await page.textContent('body');

  expect(body).toContain('http://localhost:3210/sitemaps/en');
  expect(body).toContain('http://localhost:3210/sitemaps/vi');
  expect(body).not.toMatch(/\/admin|\/api|download|operations|draft/i);
});

test('SEO-04 localized sitemaps include cross-market taxonomy and exclude private surfaces', async ({
  request
}) => {
  const [englishResponse, vietnameseResponse] = await Promise.all([
    request.get('/sitemaps/en'),
    request.get('/sitemaps/vi')
  ]);
  const english = await englishResponse.text();
  const vietnamese = await vietnameseResponse.text();

  expect(englishResponse.headers()['content-type']).toContain('application/xml');
  expect(vietnameseResponse.headers()['content-type']).toContain('application/xml');
  expect(english).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?><urlset /);
  expect(vietnamese).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?><urlset /);
  expect(english).toContain('http://localhost:3210/en/catalog');
  expect(english).toContain('http://localhost:3210/en/product/both-market-bear');
  expect(english).toContain(`http://localhost:3210/en/technique/${techniqueId}`);
  expect(english).toContain(`http://localhost:3210/en/tag/${tagId}`);
  expect(vietnamese).toContain(`http://localhost:3210/vi/ky-thuat/${techniqueId}`);
  expect(vietnamese).toContain(`http://localhost:3210/vi/the/${tagId}`);

  for (const body of [english, vietnamese]) {
    expect(body).not.toMatch(
      /\/admin|\/api|\/checkout|\/account|\/auth|download|operations|pending|draft/i
    );
    expect(body).not.toMatch(/[?&](?:market|ACTIVE_MARKET)=|\/(?:vn|intl)(?:\/|<)/i);
  }
});

test('SEO-04 robots disallows private and operational surfaces', async ({page}) => {
  await page.goto('/robots.txt');
  const body = (await page.textContent('body')) ?? '';

  expect(body).toContain('Sitemap: http://localhost:3210/sitemap.xml');
  expect(body).toContain('Disallow: /admin');
  expect(body).toContain('Disallow: /api');
  expect(body).toContain('Disallow: /checkout');
});
