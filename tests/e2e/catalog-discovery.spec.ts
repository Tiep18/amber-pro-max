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

  await page.getByRole('link', {name: 'Handmade'}).click();
  await page.getByLabel('Search products').fill('bear');
  await page.getByLabel('Sort products').selectOption('price_desc');
  await page.getByRole('button', {name: 'Apply filters'}).click();

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

  await page.getByRole('link', {name: 'PDF patterns'}).click();
  await expect(page).toHaveURL(/type=pdf_pattern/);
  await expect(page.getByRole('link', {name: 'PDF patterns'})).toHaveAttribute('aria-current', 'page');
});

test('mobile shop opens real category filters without overflowing', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/en/catalog');

  await page.getByRole('button', {name: 'Open filters'}).click();
  await expect(page.getByRole('heading', {name: 'Filters'})).toBeVisible();
  await expect(page.getByRole('group', {name: 'Category'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
