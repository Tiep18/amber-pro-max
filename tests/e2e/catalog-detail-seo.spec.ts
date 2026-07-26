import { expect, test } from './fixtures/storefront-market';

test('PDF detail is useful but unavailable without leaking price or download action', async ({
  page
}) => {
  await page.goto('/en/product/vn-bear-pattern');

  await expect(page.getByRole('heading', { name: 'VN bear pattern' })).toBeVisible();
  await expect(page.getByText('PDF pattern', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Unavailable in this shopping region' })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Switch to Vietnam' })
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('$')).not.toBeVisible();
  await expect(page.getByRole('link', { name: /download/i })).toHaveCount(0);
});

test('physical detail exposes the locale-default offer without enabling unavailable stock', async ({
  page
}) => {
  await page.goto('/en/product/intl-bear');

  await expect(page.getByText('Finished item')).toBeVisible();
  await expect(page.getByText('Packed in 1-2 business days')).toBeVisible();
  await expect(page.getByText('Manual carrier handling')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('$24.00', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeDisabled();
});

test('product metadata uses localized canonical alternates and social image', async ({ page }) => {
  await page.goto('/en/product/intl-bear');

  await expect(page).toHaveTitle('International bear');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/en/product/intl-bear'
  );
  await expect(page.locator('link[rel="alternate"][hreflang="vi"]')).toHaveAttribute(
    'href',
    'http://localhost:3210/vi/san-pham/gau-quoc-te'
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /product-media\/seed\/intl-bear\.jpg/
  );
});

test('category and collection pages emit localized metadata', async ({ page }) => {
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

test('Product JSON-LD stays locale-default while private commerce follows the active market', async ({
  storefrontMarket
}) => {
  const [vn, intl] = await Promise.all([
    storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' }),
    storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' })
  ]);
  await Promise.all([
    vn.page.goto('/en/product/intl-bear'),
    intl.page.goto('/en/product/intl-bear')
  ]);

  const productJsonLd = async (page: typeof vn.page) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    return scripts
      .map((script) => JSON.parse(script))
      .flat()
      .find((entry) => entry['@type'] === 'Product');
  };
  expect(await productJsonLd(vn.page)).toEqual(await productJsonLd(intl.page));
  expect(await productJsonLd(vn.page)).toMatchObject({
    offers: {
      priceCurrency: 'USD'
    }
  });

  await expect(
    vn.page.getByRole('heading', { name: 'Unavailable in this shopping region' })
  ).toBeVisible();
  await expect(intl.page.getByRole('main')).toContainText('$24.00');
});
