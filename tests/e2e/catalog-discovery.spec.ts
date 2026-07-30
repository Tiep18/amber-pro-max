import { expect, test } from '@playwright/test';
import { rest } from './fixtures/authenticated-users';

const VARIANT_PRODUCT_ID = '50000000-0000-0000-0000-000000000003';

async function addLongCategoryFacetFixture(page: import('@playwright/test').Page) {
  await page.route('**/api/storefront/catalog?**', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body?.status === 'ready' && Array.isArray(body.projection?.facets)) {
      body.projection.facets = [
        ...body.projection.facets,
        ...Array.from({ length: 20 }, (_, index) => ({
          facet_type: 'category',
          id: `long-category-${index + 1}`,
          slug: `long-category-${index + 1}`,
          label: `Needle category ${index + 1}`,
          product_count: index % 4 === 0 ? 0 : index + 1
        }))
      ];
    }
    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });
}

async function addPagedProductFixture(page: import('@playwright/test').Page) {
  const requestedOffsets: number[] = [];
  let productTemplate: Record<string, unknown> | undefined;
  await page.route('**/api/storefront/catalog?**', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body?.status === 'ready' && Array.isArray(body.projection?.products)) {
      productTemplate ??= body.projection.products[0];
      const template = productTemplate;
      if (template) {
        const offset = Number(new URL(route.request().url()).searchParams.get('offset') ?? '0');
        requestedOffsets.push(offset);
        const products = Array.from({ length: 60 }, (_, index) => ({
          ...template,
          product_id: `60000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
          slug: `paged-product-${index + 1}`,
          title: `Paged product ${index + 1}`
        }));
        body.projection.products = products.slice(offset, offset + 48);
        body.projection.totalCount = products.length;
      }
    }
    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });
  return requestedOffsets;
}

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

test('listing shows only active-market products with currency and type badges', async ({
  page
}) => {
  await page.goto('/en/catalog');

  await expect(page.getByRole('heading', { name: 'Shop crochet goods' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'International bear' })).toContainText('$24.00');
  await expect(page.getByRole('article', { name: 'International bear' })).toContainText(
    'Finished item'
  );
  await expect(page.getByText('VN bear pattern')).not.toBeVisible();

  await page.getByTestId('commerce-context-trigger').click();
  await page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();
  await expect(page.getByRole('article', { name: 'VN bear pattern' })).toContainText('125.000');
  await expect(page.getByRole('article', { name: 'VN bear pattern' })).toContainText('PDF pattern');
  await expect(page.getByText('International bear')).not.toBeVisible();
});

test('catalog search type and sort controls compose through the URL', async ({ page }) => {
  await page.goto('/en/catalog');

  const catalogStatus = page.getByRole('main').getByRole('status');
  await expect(catalogStatus).toContainText(/International store loaded\.\s+2 products/i, {
    timeout: 20_000
  });
  const handmadeLink = page.getByRole('link', { name: 'Handmade', exact: true });
  await expect(handmadeLink).toHaveAttribute('href', '/en/catalog?type=physical_finished');
  await Promise.all([page.waitForURL(/type=physical_finished/), handmadeLink.click()]);
  await expect(page).toHaveURL(/type=physical_finished/);
  await expect(catalogStatus).toContainText(/International store loaded\.\s+2 products/i, {
    timeout: 20_000
  });
  await page.getByLabel('Search products').fill('bear');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/search=bear/);
  await expect(page).toHaveURL(/type=physical_finished/);
  await expect(catalogStatus).toContainText(/International store loaded\.\s+2 products/i, {
    timeout: 20_000
  });
  await page.getByRole('combobox', { name: 'Sort products' }).click();
  await page.getByRole('option', { name: 'Price: high to low' }).click();

  await expect(page).toHaveURL(/search=bear/);
  await expect(page).toHaveURL(/type=physical_finished/);
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page.getByRole('article', { name: 'Both-market bear' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'International bear' })).toBeVisible();
});

test('localized category and collection pages preserve eligible assortment', async ({ page }) => {
  await page.goto('/en/category/stuffed-animals');
  await expect(page.getByRole('heading', { name: 'Stuffed animals' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'International bear' })).toBeVisible();

  await page.goto('/en/collection/gifts');
  const cards = page.getByRole('article');
  await expect(page.getByRole('heading', { name: 'Gifts' })).toBeVisible();
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Both-market bear');
  await expect(cards.nth(1)).toContainText('International bear');
});

test('catalog empty results remain accessible and localized', async ({ page }) => {
  await page.goto('/vi/cua-hang?search=khong-ton-tai');
  await expect(
    page.getByRole('heading', { name: /Khong co san pham phu hop voi khu vuc va bo loc nay/i })
  ).toBeVisible();
});

test('shop workspace exposes navigation, result count, and product tabs', async ({ page }) => {
  await page.goto('/en/catalog');

  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumb.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(breadcrumb.getByText('Shop')).toBeVisible();
  await expect(page.getByTestId('catalog-result-count')).toContainText(/products?/i);

  await page.getByRole('link', { name: 'PDF patterns', exact: true }).click();
  await expect(page).toHaveURL(/type=pdf_pattern/);
  await expect(page.getByRole('link', { name: 'PDF patterns', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
});

test('mobile shop opens real category filters without overflowing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/catalog');

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Category' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});

test('desktop filter sidebar is viewport-bounded and independently scrollable', async ({
  page
}) => {
  await addLongCategoryFacetFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/catalog');
  await expect(page.getByRole('main').getByRole('status')).toContainText(/store loaded/i, {
    timeout: 20_000
  });

  const sidebar = page.getByRole('complementary', { name: 'Filters' });
  await expect(sidebar).toBeVisible();
  const geometry = await sidebar.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      overflowY: style.overflowY,
      top: rect.top,
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    };
  });

  expect(geometry.overflowY).toBe('auto');
  expect(geometry.top).toBeGreaterThanOrEqual(80);
  expect(geometry.bottom).toBeLessThanOrEqual(904);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
});

test('mobile filter sheet handles long category lists and local search', async ({ page }) => {
  await addLongCategoryFacetFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/catalog');
  await expect(page.getByRole('main').getByRole('status')).toContainText(/store loaded/i, {
    timeout: 20_000
  });

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const categorySearch = page.getByRole('dialog').getByPlaceholder('Find a category…');
  await expect(categorySearch).toBeVisible();
  await categorySearch.fill('Needle category 17');
  const filterDialog = page.getByRole('dialog');
  await expect(filterDialog.getByText('Needle category 17', { exact: true })).toBeVisible();
  await expect(filterDialog.getByText('Needle category 16', { exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});

test('search and sort controls follow URL state after clear and browser history', async ({
  page
}) => {
  await page.goto('/en/catalog');
  const catalogStatus = page.getByRole('main').getByRole('status');
  await expect(catalogStatus).toContainText(/store loaded/i, { timeout: 20_000 });

  await page.getByLabel('Search products').fill('bear');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/search=bear/);
  await page.getByRole('combobox', { name: 'Sort products' }).click();
  await page.getByRole('option', { name: 'Price: high to low' }).click();
  await expect(page).toHaveURL(/sort=price_desc/);

  await page.getByRole('link', { name: 'Clear filters', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/catalog$/);
  await expect(page.getByLabel('Search products')).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveText('Newest');

  await page.goBack();
  await expect(page).toHaveURL(/search=bear/);
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page.getByLabel('Search products')).toHaveValue('bear');
  await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveText(
    'Price: high to low'
  );
});

test('mobile filter trigger reports the number of active filters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/catalog');
  await page.getByRole('link', { name: 'PDF patterns', exact: true }).click();
  await expect(page).toHaveURL(/type=pdf_pattern/);
  await expect(page.getByRole('button', { name: 'Filters (1)', exact: true })).toBeVisible();
});

test('product cards use compact text treatment only on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/catalog');

  const card = page.getByRole('article').first();
  const content = card.locator(':scope > div').last();
  const description = card.locator('p').first();

  await expect(description).toHaveCSS('-webkit-line-clamp', '1');
  await expect(description).toHaveCSS('font-size', '12px');
  await expect(content).toHaveCSS('padding', '12px');

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(description).toHaveCSS('-webkit-line-clamp', '2');
  await expect(description).toHaveCSS('font-size', '14px');
  await expect(content).toHaveCSS('padding', '20px');
});

test('catalog omits load more after the complete active-market result set is loaded', async ({
  page
}) => {
  await page.goto('/en/catalog');

  await expect(page.getByTestId('catalog-result-count')).toContainText('2 products');
  await expect(page.getByTestId('catalog-load-more')).toHaveCount(0);
});

test('load more appends a bounded server page beyond the first 48 products', async ({ page }) => {
  const requestedOffsets = await addPagedProductFixture(page);
  await page.goto('/en/catalog');
  await expect(page.getByTestId('catalog-result-count')).toContainText('60 products', {
    timeout: 20_000
  });

  const loadMore = page.getByTestId('catalog-load-more');
  for (let index = 0; index < 4; index += 1) {
    await loadMore.click();
  }

  await expect(page.getByRole('article')).toHaveCount(60);
  await expect(loadMore).toHaveCount(0);
  expect(requestedOffsets).toContain(48);
});

test('catalog eagerly loads only the first product image for LCP', async ({ page }) => {
  await page.route('**/_next/image?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl2IAAAAASUVORK5CYII=',
        'base64'
      )
    });
  });
  await page.goto('/en/catalog');

  const cards = page.getByRole('article');
  await expect(cards.first().locator('img')).toHaveAttribute('loading', 'eager');
  await expect(cards.nth(1).locator('img')).toHaveAttribute('loading', 'lazy');
});
