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
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name: 'Cửa hàng', exact: true })
    .click();
  await expect(page).toHaveURL(/\/vi\/cua-hang$/);

  expect(contextRequests).toBe(0);
});

test('catalog batches personalized wishlist state without making the page dynamic', async ({
  page
}) => {
  const settledCatalogResponse = page.waitForResponse((response) =>
    response.url().includes('/api/storefront/catalog?')
  );
  await page.goto('/vi/cua-hang');
  const catalogPayload = (await (await settledCatalogResponse).json()) as {
    status?: unknown;
    projection?: { products?: unknown };
  };
  expect(catalogPayload.status).toBe('ready');
  expect(Array.isArray(catalogPayload.projection?.products)).toBe(true);
  const authoritativeProducts = catalogPayload.projection?.products as Array<{
    product_id?: unknown;
  }>;
  expect(authoritativeProducts.every((product) => typeof product.product_id === 'string')).toBe(
    true
  );
  const authoritativeProductIds = authoritativeProducts.map(
    (product) => product.product_id as string
  );

  const catalogResultStage = page.getByTestId('catalog-result-stage');
  await expect(catalogResultStage).toHaveAttribute('data-state', 'ready');
  const settledProductInputs = catalogResultStage.locator('article input[name="productId"]');
  await expect
    .poll(async () =>
      settledProductInputs.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value).sort()
      )
    )
    .toEqual([...authoritativeProductIds].sort());
  const settledProductIds = await settledProductInputs.evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value)
  );
  expect(settledProductIds.length).toBeGreaterThan(1);
  expect(new Set(settledProductIds).size).toBe(settledProductIds.length);

  const routedWishlistUrls: string[] = [];
  await page.route('**/api/wishlist?**', async (route) => {
    routedWishlistUrls.push(route.request().url());
    await route.continue();
  });
  const [settledWishlistResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/wishlist?')),
    page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('storefront-context-changed'));
    })
  ]);
  expect(settledWishlistResponse.ok()).toBe(true);
  await expect(catalogResultStage).toHaveAttribute('data-state', 'ready');

  expect(routedWishlistUrls).toHaveLength(1);
  const productIds =
    new URL(routedWishlistUrls[0]).searchParams.get('productIds')?.split(',') ?? [];
  expect(productIds).toHaveLength(settledProductIds.length);
  expect([...productIds].sort()).toEqual([...settledProductIds].sort());
});
