import { expect, test } from '@playwright/test';
import { rest } from './fixtures/authenticated-users';

const VARIANT_PRODUCT_ID = '50000000-0000-0000-0000-000000000003';

async function setVariantFixtureStatus(status: 'draft' | 'published') {
  await rest(`products?id=eq.${VARIANT_PRODUCT_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null
    })
  });
}

test.beforeAll(async () => {
  await setVariantFixtureStatus('published');
});

test.afterAll(async () => {
  await setVariantFixtureStatus('draft');
});

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

  await page
    .getByRole('navigation', {name: 'Dieu huong chinh'})
    .getByRole('link', {name: 'Cua hang', exact: true})
    .click();
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
  expect(productIds).toHaveLength(await page.getByRole('article').count());
  expect(productIds.length).toBeGreaterThan(1);
});
