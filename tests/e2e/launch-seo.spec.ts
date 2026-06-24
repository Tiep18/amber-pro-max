import {expect, test} from '@playwright/test';

test('SEO-02 SEO-03 D-05 D-06 D-08 product page emits localized metadata and safe JSON-LD', async ({page}) => {
  await page.goto('/en/product/both-market-bear');

  await expect(page).toHaveTitle('Both-market bear');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://127.0.0.1:3210/en/product/both-market-bear'
  );
  await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute(
    'href',
    'http://127.0.0.1:3210/vi/san-pham/gau-ca-hai'
  );

  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const structured = scripts.map((script) => JSON.parse(script)) as Array<Record<string, unknown> | Array<Record<string, unknown>>>;
  const flattened = structured.flat();

  expect(flattened.some((entry) => entry['@type'] === 'Product' && entry.name === 'Both-market bear')).toBe(true);
  expect(flattened.some((entry) => entry['@type'] === 'BreadcrumbList')).toBe(true);
  expect(JSON.stringify(flattened)).not.toMatch(/admin|download-token|secret|signature/i);
});
