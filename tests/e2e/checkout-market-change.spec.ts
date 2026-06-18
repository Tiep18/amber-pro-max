import {expect, test} from '@playwright/test';

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
    headers: {...serviceHeaders, ...init?.headers}
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
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: 'physical_finished', status: 'published', published_at: new Date().toISOString()})
  });
  const [{id}] = (await productResponse.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'vi',
        title: 'Gau giao hang',
        description: 'Gau moc co phi van chuyen.',
        specifications: {material: 'cotton'},
        slug: `gau-giao-hang-${suffix}`,
        seo_title: 'Gau giao hang',
        seo_description: 'Gau handmade.'
      },
      {
        product_id: id,
        locale: 'en',
        title: 'Shipping test bear',
        description: 'Ready-made bear with shipping.',
        specifications: {material: 'cotton'},
        slug: `shipping-test-bear-${suffix}`,
        seo_title: 'Shipping test bear',
        seo_description: 'Handmade bear.'
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {product_id: id, market_code: 'vn', currency_code: 'VND', enabled: true, price_minor: 250000},
      {product_id: id, market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 1800}
    ])
  });

  await rest('inventory_records', {
    method: 'POST',
    body: JSON.stringify({product_id: id, quantity_on_hand: 3})
  });

  const profileResponse = await rest('shipping_profiles', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({name: `Checkout shipping ${suffix}`})
  });
  const [{id: profileId}] = (await profileResponse.json()) as Array<{id: string}>;
  createdProfileIds.push(profileId);
  await rest('shipping_rules', {
    method: 'POST',
    body: JSON.stringify([
      {profile_id: profileId, country_code: 'US', currency_code: 'USD', first_item_fee_minor: 750, additional_item_fee_minor: 225},
      {profile_id: profileId, country_code: 'VN', currency_code: 'VND', first_item_fee_minor: 30000, additional_item_fee_minor: 10000}
    ])
  });
  await rest('product_shipping_profiles', {
    method: 'POST',
    body: JSON.stringify({product_id: id, profile_id: profileId})
  });

  return id;
}

test.afterEach(async () => {
  for (const productId of createdProductIds.splice(0)) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
  for (const profileId of createdProfileIds.splice(0)) {
    await rest(`shipping_profiles?id=eq.${profileId}`, {method: 'DELETE'});
  }
});

test('destination changes require a blocking material-change confirmation', async ({page}) => {
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
              marketAtAdd: 'vn',
              addedAt: timestamp,
              updatedAt: timestamp
            }
          ]
        })
      );
    },
    {productId, now}
  );

  await page.goto('/vi/thanh-toan');
  await expect(page.getByRole('heading', {name: 'Thanh toan'})).toBeVisible();
  await page.getByPlaceholder('Tim quoc gia').fill('US');
  await page.getByRole('combobox', {name: 'Quoc gia giao hang'}).selectOption('US');
  await page.getByLabel('Ten nguoi nhan').fill('Taylor Customer');
  await page.getByLabel('So dien thoai').fill('+15551234567');
  await page.getByLabel('Dia chi dong 1').fill('123 Market Street');
  await page.getByRole('button', {name: 'Cap nhat dia chi giao hang'}).click();
  await expect(page.getByRole('dialog', {name: 'Xem lai thay doi giao hang'})).toBeVisible();
  await expect(page.getByText(/Market: vn -> intl/)).toBeVisible();
  await page.getByRole('button', {name: 'Giu bao gia cu'}).click();
  await expect(page.getByRole('dialog', {name: 'Xem lai thay doi giao hang'})).toHaveCount(0);

  await page.getByRole('button', {name: 'Cap nhat dia chi giao hang'}).click();
  await page.getByRole('button', {name: 'Xac nhan thay doi'}).click();
  await expect(page.getByText('$25.50')).toBeVisible();
});
