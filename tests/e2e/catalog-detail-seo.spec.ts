import {expect, test} from '@playwright/test';

test('PDF detail is useful but unavailable without leaking price or download action', async ({page}) => {
  await page.goto('/en/product/vn-bear-pattern');

  await expect(page.getByRole('heading', {name: 'VN bear pattern'})).toBeVisible();
  await expect(page.getByText('PDF pattern', {exact: true})).toBeVisible();
  await expect(page.getByText('Digital pattern, not a finished item')).toBeVisible();
  await expect(page.getByText('Not available in your market')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', {name: 'Use Vietnam market'})).toBeVisible();
  await expect(page.getByText('$')).not.toBeVisible();
  await expect(page.getByRole('link', {name: /download/i})).toHaveCount(0);
});

test('physical detail exposes explicit variant stock states', async ({page}) => {
  await page.goto('/en/product/both-market-bear');

  await expect(page.getByText('Finished item')).toBeVisible();
  await expect(page.getByText('Shipping is arranged after purchase')).toBeVisible();
  await expect(page.getByRole('radio', {name: /small/i})).toBeEnabled();
  await expect(page.getByRole('radio', {name: /large/i})).toBeDisabled();
  await page.getByRole('radio', {name: /small/i}).check();
  await expect(page.getByText('$31.00')).toBeVisible();
});

test('product metadata uses localized canonical alternates and social image', async ({page}) => {
  await page.goto('/en/product/both-market-bear');

  await expect(page).toHaveTitle('Both-market bear');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/en/product/both-market-bear'
  );
  await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/vi/san-pham/gau-ca-hai'
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /product-media\/seed\/both-bear\.jpg/
  );
});

test('category and collection pages emit localized metadata', async ({page}) => {
  await page.goto('/en/category/stuffed-animals');
  await expect(page).toHaveTitle('Stuffed animals');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/en/category/stuffed-animals'
  );

  await page.goto('/vi/bo-suu-tap/qua-tang');
  await expect(page).toHaveTitle('Qua tang handmade');
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/en/collection/gifts'
  );
});
