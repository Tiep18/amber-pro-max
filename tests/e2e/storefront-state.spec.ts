import { expect, test } from '@playwright/test';

test('client navigation preserves header context without refetching it', async ({ page }) => {
  const initialContext = page.waitForResponse((response) =>
    response.url().endsWith('/api/storefront-context')
  );
  await page.goto('/vi');
  await initialContext;

  let contextRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/storefront-context')) contextRequests += 1;
  });

  const shopLinks = page.locator('a[href="/vi/cua-hang"]');
  expect(await shopLinks.count()).toBeGreaterThan(0);
  await shopLinks.first().click();
  await expect(page).toHaveURL(/\/vi\/cua-hang$/);

  expect(contextRequests).toBe(0);
});
