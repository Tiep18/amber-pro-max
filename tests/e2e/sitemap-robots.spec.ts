import {expect, test} from '@playwright/test';

test('SEO-02 SEO-04 D-05 D-07 sitemap index points to localized public sitemaps only', async ({page}) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.headers()['content-type']).toContain('application/xml');
  const body = await page.textContent('body');

  expect(body).toContain('http://localhost:3210/sitemaps/en');
  expect(body).toContain('http://localhost:3210/sitemaps/vi');
  expect(body).not.toMatch(/\/admin|\/api|download|operations|draft/i);
});

test('SEO-04 localized sitemap includes public catalog URLs and excludes private surfaces', async ({page}) => {
  await page.goto('/sitemaps/en');
  const body = (await page.textContent('body')) ?? '';

  expect(body).toContain('http://localhost:3210/en/catalog');
  expect(body).toContain('http://localhost:3210/en/product/both-market-bear');
  expect(body).not.toMatch(/\/admin|\/api|download|operations|pending|draft/i);
});

test('SEO-04 robots disallows private and operational surfaces', async ({page}) => {
  await page.goto('/robots.txt');
  const body = (await page.textContent('body')) ?? '';

  expect(body).toContain('Sitemap: http://localhost:3210/sitemap.xml');
  expect(body).toContain('Disallow: /admin');
  expect(body).toContain('Disallow: /api');
  expect(body).toContain('Disallow: /checkout');
});
