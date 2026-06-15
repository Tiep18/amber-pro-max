import {expect, test} from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const fallbackServiceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const resolvedServiceRoleKey = serviceRoleKey.includes('zdJsyH') ? serviceRoleKey : fallbackServiceRoleKey;
const serviceHeaders = {
  apikey: resolvedServiceRoleKey,
  Authorization: `Bearer ${resolvedServiceRoleKey}`,
  'Content-Type': 'application/json'
};

const createdProductIds: string[] = [];
const createdDiscountIds: string[] = [];

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {...serviceHeaders, ...init?.headers}
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function createPublishedDigitalProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const productResponse = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: 'pdf_pattern', status: 'published', published_at: new Date().toISOString()})
  });
  const [{id}] = (await productResponse.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'en',
        title: 'Discount test pattern',
        description: 'Pattern with discount.',
        specifications: {pages: '12'},
        slug: `discount-test-pattern-${suffix}`,
        seo_title: 'Discount test pattern',
        seo_description: 'Discount pattern.'
      },
      {
        product_id: id,
        locale: 'vi',
        title: 'Mau giam gia',
        description: 'Mau co ma giam gia.',
        specifications: {pages: '12'},
        slug: `mau-giam-gia-${suffix}`,
        seo_title: 'Mau giam gia',
        seo_description: 'Mau giam gia.'
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {product_id: id, market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 2500},
      {product_id: id, market_code: 'vn', currency_code: 'VND', enabled: true, price_minor: 250000}
    ])
  });

  return id;
}

async function createDiscountCode(code: string) {
  const response = await rest('discount_codes', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      code,
      description: 'Checkout discount',
      discount_type: 'percentage',
      percentage_bps: 1000,
      market: 'intl',
      minimum_subtotal_minor: 0
    })
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdDiscountIds.push(id);
}

test.afterEach(async () => {
  for (const discountId of createdDiscountIds.splice(0)) {
    await rest(`discount_codes?id=eq.${discountId}`, {method: 'DELETE'});
  }
  for (const productId of createdProductIds.splice(0)) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
});

test('discount code applies and removes through server quote without localStorage trust', async ({page}) => {
  const productId = await createPublishedDigitalProduct();
  const code = `CHECKOUT${Date.now().toString().slice(-6)}`;
  await createDiscountCode(code);
  const now = new Date().toISOString();

  await page.goto('/en');
  await page.evaluate(
    ({productId: seededProductId, now: timestamp}) => {
      window.localStorage.setItem(
        'amigurumi.guestCart.v1',
        JSON.stringify({
          version: 1,
          updatedAt: timestamp,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            {
              productId: seededProductId,
              variantId: null,
              quantity: 1,
              marketAtAdd: 'intl',
              addedAt: timestamp,
              updatedAt: timestamp
            }
          ]
        })
      );
    },
    {productId, now}
  );

  await page.goto('/en/checkout');
  await expect(page.getByRole('heading', {name: 'Checkout'})).toBeVisible();
  await page.getByLabel('Discount code').fill(code.toLowerCase());
  await page.getByRole('button', {name: 'Apply discount'}).click();

  await expect(page.getByText('Discount CHECKOUT')).toBeVisible();
  await expect(page.getByText('-$2.50')).toBeVisible();
  await expect(page.getByText('$22.50')).toBeVisible();
  await expect(page.evaluate(() => window.localStorage.getItem('amigurumi.guestCart.v1'))).resolves.not.toContain(code);

  await page.getByRole('button', {name: 'Remove discount'}).click();
  await expect(page.getByText('Discount CHECKOUT')).toHaveCount(0);
  await expect(page.getByText('$25.00').last()).toBeVisible();
});
