import {expect, test} from '@playwright/test';

test('listing shows only active-market products with currency and type badges', async ({page}) => {
  await page.goto('/en/catalog');

  await expect(page.getByRole('heading', {name: 'Shop crochet goods'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'International bear'})).toContainText('$24.00');
  await expect(page.getByRole('article', {name: 'International bear'})).toContainText('Finished item');
  await expect(page.getByText('VN bear pattern')).not.toBeVisible();

  await page.getByRole('banner').getByRole('button', {name: 'Use Vietnam market'}).click();
  await expect(page.getByRole('article', {name: 'VN bear pattern'})).toContainText('125.000');
  await expect(page.getByRole('article', {name: 'VN bear pattern'})).toContainText('PDF pattern');
  await expect(page.getByText('International bear')).not.toBeVisible();
});

test('catalog search type and sort controls compose through the URL', async ({page}) => {
  await page.goto('/en/catalog');

  await page.getByRole('link', {name: 'Handmade', exact: true}).click();
  await page.getByLabel('Search products').fill('bear');
  await page.getByRole('combobox', {name: 'Sort products'}).click();
  await page.getByRole('option', {name: 'Price: high to low'}).click();

  await expect(page).toHaveURL(/search=bear/);
  await expect(page).toHaveURL(/type=physical_finished/);
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page.getByRole('article', {name: 'Both-market bear'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'International bear'})).toBeVisible();
});

test('localized category and collection pages preserve eligible assortment', async ({page}) => {
  await page.goto('/en/category/stuffed-animals');
  await expect(page.getByRole('heading', {name: 'Stuffed animals'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'International bear'})).toBeVisible();

  await page.goto('/en/collection/gifts');
  const cards = page.getByRole('article');
  await expect(page.getByRole('heading', {name: 'Gifts'})).toBeVisible();
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Both-market bear');
  await expect(cards.nth(1)).toContainText('International bear');
});

test('catalog empty results remain accessible and localized', async ({page}) => {
  await page.goto('/vi/cua-hang?search=khong-ton-tai');
  await expect(page.getByRole('heading', {name: 'Khong tim thay san pham'})).toBeVisible();
});

test('shop workspace exposes navigation, result count, and product tabs', async ({page}) => {
  await page.goto('/en/catalog');

  const breadcrumb = page.getByRole('navigation', {name: 'Breadcrumb'});
  await expect(breadcrumb.getByRole('link', {name: 'Home'})).toBeVisible();
  await expect(breadcrumb.getByText('Shop')).toBeVisible();
  await expect(page.getByTestId('catalog-result-count')).toContainText(/products?/i);

  await page.getByRole('link', {name: 'PDF patterns', exact: true}).click();
  await expect(page).toHaveURL(/type=pdf_pattern/);
  await expect(page.getByRole('link', {name: 'PDF patterns', exact: true})).toHaveAttribute('aria-current', 'page');
});

test('mobile shop opens real category filters without overflowing', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/en/catalog');

  await page.getByRole('button', {name: 'Filters', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Filters'})).toBeVisible();
  await expect(page.getByRole('group', {name: 'Category'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('product cards use compact text treatment only on mobile', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/en/catalog');

  const card = page.getByRole('article').first();
  const content = card.locator(':scope > div').last();
  const description = card.locator('p').first();

  await expect(description).toHaveCSS('-webkit-line-clamp', '1');
  await expect(description).toHaveCSS('font-size', '12px');
  await expect(content).toHaveCSS('padding', '12px');

  await page.setViewportSize({width: 1024, height: 900});
  await expect(description).toHaveCSS('-webkit-line-clamp', '2');
  await expect(description).toHaveCSS('font-size', '14px');
  await expect(content).toHaveCSS('padding', '20px');
});

test('catalog uses a branded load-more control without a heavy divider', async ({page}) => {
  await page.goto('/en/catalog');

  const loadMore = page.getByTestId('catalog-load-more');
  await expect(loadMore).toBeVisible();
  await expect(loadMore.locator('svg')).toHaveAttribute('data-load-more-icon', 'true');
  await expect(loadMore.locator('..')).toHaveCSS('border-top-width', '0px');
});

test('catalog eagerly loads only the first product image for LCP', async ({page}) => {
  await page.goto('/en/catalog');

  const cards = page.getByRole('article');
  await expect(cards.first().locator('img')).toHaveAttribute('loading', 'eager');
  await expect(cards.nth(1).locator('img')).toHaveAttribute('loading', 'lazy');
});
