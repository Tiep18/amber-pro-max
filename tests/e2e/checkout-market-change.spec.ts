import { expect, test } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const createdProductIds: string[] = [];
const createdProfileIds: string[] = [];

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders, ...init?.headers }
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function createPublishedPhysicalProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const productResponse = await rest('products', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      product_type: 'physical_finished',
      status: 'published',
      published_at: new Date().toISOString()
    })
  });
  const [{ id }] = (await productResponse.json()) as Array<{ id: string }>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'vi',
        title: 'Gấu giao hàng',
        description: 'Gấu móc có phí vận chuyển.',
        specifications: { material: 'cotton' },
        slug: `gau-giao-hang-${suffix}`,
        seo_title: 'Gấu giao hàng',
        seo_description: 'Gấu handmade.'
      },
      {
        product_id: id,
        locale: 'en',
        title: 'Shipping test bear',
        description: 'Ready-made bear with shipping.',
        specifications: { material: 'cotton' },
        slug: `shipping-test-bear-${suffix}`,
        seo_title: 'Shipping test bear',
        seo_description: 'Handmade bear.'
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        market_code: 'vn',
        currency_code: 'VND',
        enabled: true,
        price_minor: 250000
      },
      {
        product_id: id,
        market_code: 'intl',
        currency_code: 'USD',
        enabled: true,
        price_minor: 1800
      }
    ])
  });

  await rest('inventory_records', {
    method: 'POST',
    body: JSON.stringify({ product_id: id, quantity_on_hand: 3 })
  });

  const profileResponse = await rest('shipping_profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: `Checkout shipping ${suffix}` })
  });
  const [{ id: profileId }] = (await profileResponse.json()) as Array<{ id: string }>;
  createdProfileIds.push(profileId);
  await rest('shipping_rules', {
    method: 'POST',
    body: JSON.stringify([
      {
        profile_id: profileId,
        country_code: 'US',
        currency_code: 'USD',
        first_item_fee_minor: 750,
        additional_item_fee_minor: 225
      },
      {
        profile_id: profileId,
        country_code: 'VN',
        currency_code: 'VND',
        first_item_fee_minor: 30000,
        additional_item_fee_minor: 10000
      }
    ])
  });
  await rest('product_shipping_profiles', {
    method: 'POST',
    body: JSON.stringify({ product_id: id, profile_id: profileId })
  });

  return id;
}

test.afterEach(async () => {
  for (const productId of createdProductIds.splice(0)) {
    await rest(`products?id=eq.${productId}`, { method: 'DELETE' });
  }
  for (const profileId of createdProfileIds.splice(0)) {
    await rest(`shipping_profiles?id=eq.${profileId}`, { method: 'DELETE' });
  }
});

test('destination changes require a blocking material-change confirmation', async ({ page }) => {
  const productId = await createPublishedPhysicalProduct();
  const now = new Date().toISOString();
  await page.context().addCookies([
    {
      name: 'ACTIVE_MARKET',
      value: 'vn',
      domain: '127.0.0.1',
      path: '/'
    }
  ]);
  await page.goto('/vi');
  await page.evaluate(
    ({ productId: seededProductId, now: timestamp }) => {
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
              marketAtAdd: 'vn',
              addedAt: timestamp,
              updatedAt: timestamp
            }
          ]
        })
      );
    },
    { productId, now }
  );

  await page.goto('/vi/thanh-toan');
  await expect(page.getByRole('heading', { name: 'Thanh toán' })).toBeVisible();
  const shippingCountry = page.getByRole('combobox', { name: 'Quốc gia giao hàng' });
  const review = page.getByRole('dialog', { name: 'Phí giao hàng và tổng tiền đã thay đổi' });

  await shippingCountry.click();
  await page.getByRole('option', { name: 'Hoa Kỳ', exact: true }).click();
  await expect(review).toBeVisible();
  await expect(review).toContainText(/\$25\.50/);

  // Reviewing the destination restores the last accepted destination, so the
  // country has to be chosen again before the new quote can be accepted.
  await review.getByRole('button', { name: 'Xem lại địa chỉ' }).click();
  await expect(review).toHaveCount(0);
  await expect(shippingCountry).toContainText('Chọn quốc gia');

  await shippingCountry.click();
  await page.getByRole('option', { name: 'Hoa Kỳ', exact: true }).click();
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: 'Dùng báo giá mới' }).click();

  // Narrowing the destination to a region re-quotes against a new shipping
  // basis, so the confirmation gate is raised again before it is accepted.
  await page.getByRole('combobox', { name: 'Bang hoặc vùng lãnh thổ' }).click();
  await page.getByRole('option', { name: 'California (CA)', exact: true }).click();
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: 'Dùng báo giá mới' }).click();
  await expect(review).toHaveCount(0);

  // Scoped to the destination section: "Địa chỉ" also matches the section
  // landmark itself and the footer newsletter field.
  const destination = page.getByRole('region', { name: 'Địa chỉ giao hàng' });
  await destination.getByLabel('Tên người nhận').fill('Taylor Customer');
  await destination.getByLabel('Số điện thoại').fill('+15551234567');
  await destination.getByLabel('Địa chỉ').fill('123 Market Street');
  await destination.getByLabel('Mã ZIP hoặc mã bưu chính').fill('94105');
  await expect(page.getByTestId('checkout-total')).toHaveText('$25.50');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('combobox', { name: 'Quốc gia giao hàng' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});

test('Vietnam destination overrides international browsing and requires the VND VietQR pair', async ({
  page
}) => {
  const productId = await createPublishedPhysicalProduct();
  const now = new Date().toISOString();
  await page.context().addCookies([
    {
      name: 'ACTIVE_MARKET',
      value: 'intl',
      domain: '127.0.0.1',
      path: '/'
    }
  ]);
  await page.goto('/en');
  await page.evaluate(
    ({ productId: seededProductId, now: timestamp }) => {
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
    { productId, now }
  );

  await page.goto('/en/checkout');
  await expect(page.getByTestId('checkout-total')).toHaveText('$18.00');
  const shippingCountry = page.getByRole('combobox', { name: 'Shipping country' });
  await shippingCountry.click();
  await page.getByRole('option', { name: 'Vietnam', exact: true }).click();

  const review = page.getByRole('dialog', { name: 'Shipping and total changed' });
  await expect(review).toBeVisible();
  await expect(review).toContainText(/30[.,]000/);
  await review.getByRole('button', { name: 'Review destination' }).click();
  await expect(shippingCountry).toContainText('Choose a country');

  await shippingCountry.click();
  await page.getByRole('option', { name: 'Vietnam', exact: true }).click();
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: 'Use updated quote' }).click();
  await expect(page.getByTestId('checkout-total')).toContainText(/280[.,]000/);

  const paymentMethod = page.getByTestId('checkout-payment-method-desktop');
  await expect(paymentMethod).toContainText('VietQR');
  await expect(paymentMethod).not.toContainText('PayPal');

  const marketTrigger = page.getByTestId('commerce-context-trigger');
  await marketTrigger.click();
  await page.getByRole('menuitemradio', {name: /Vietnam.*VND/i}).click();
  await expect(page.getByTestId('checkout-total')).toContainText(/280[.,]000/);
  await expect(paymentMethod).toContainText('VietQR');

  await marketTrigger.click();
  await page.getByRole('menuitemradio', {name: /International.*USD/i}).click();
  await expect(page.getByTestId('checkout-total')).toContainText(/280[.,]000/);
  await expect(paymentMethod).toContainText('VietQR');
  await expect(paymentMethod).not.toContainText('PayPal');
});
