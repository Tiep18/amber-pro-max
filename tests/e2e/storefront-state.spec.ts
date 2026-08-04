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
    .getByRole('navigation', {name: 'Điều hướng chính'})
    .getByRole('link', {name: 'Cửa hàng', exact: true})
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
  const catalogResultStage = page.getByTestId('catalog-result-stage');
  await expect(catalogResultStage).toHaveAttribute('data-state', 'ready');
  const settledCards = page.getByRole('article');
  await expect(settledCards).toHaveCount(3);
  const settledCardCount = await settledCards.count();
  let settledProductIds: string[] = [];
  await expect
    .poll(() => {
      settledProductIds = [
        ...new Set(
          wishlistRequests.flatMap(
            (url) => new URL(url).searchParams.get('productIds')?.split(',') ?? []
          )
        )
      ];
      return settledProductIds.length;
    })
    .toBe(settledCardCount);
  wishlistRequests.splice(0);

  const settledWishlistResponse = page.waitForResponse((response) =>
    response.url().includes('/api/wishlist?')
  );
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('storefront-context-changed'));
  });
  await settledWishlistResponse;
  await expect(catalogResultStage).toHaveAttribute('data-state', 'ready');

  expect(wishlistRequests).toHaveLength(1);
  const productIds = new URL(wishlistRequests[0]).searchParams.get('productIds')?.split(',') ?? [];
  expect(productIds).toHaveLength(settledCardCount);
  expect([...productIds].sort()).toEqual([...settledProductIds].sort());
  expect(productIds.length).toBeGreaterThan(1);
});
