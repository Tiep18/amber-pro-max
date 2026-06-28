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

test('catalog batches personalized wishlist state without making the page dynamic', async ({
  page
}) => {
  const wishlistRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/wishlist?')) wishlistRequests.push(request.url());
  });

  await page.goto('/vi/cua-hang');
  await page.waitForResponse((response) => response.url().includes('/api/wishlist?'));

  expect(wishlistRequests).toHaveLength(1);
  const productIds = new URL(wishlistRequests[0]).searchParams.get('productIds')?.split(',') ?? [];
  expect(productIds.length).toBeGreaterThan(1);
});
