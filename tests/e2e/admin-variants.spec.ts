import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

test.describe.configure({mode: 'serial'});

const createdUserIds: string[] = [];
const createdProductIds: string[] = [];

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

async function createConfirmedUser(role?: 'admin') {
  const email = `variants-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'secure-password-123';
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({email, password, email_confirm: true})
  });
  if (!response.ok) {
    throw new Error(`User creation failed: ${response.status} ${await response.text()}`);
  }

  const user = (await response.json()) as {id: string};
  createdUserIds.push(user.id);
  if (role === 'admin') {
    await rest('user_roles', {
      method: 'POST',
      headers: {Prefer: 'resolution=merge-duplicates'},
      body: JSON.stringify({user_id: user.id, role: 'admin', note: 'E2E variants admin'})
    });
  }
  return {email, password};
}

async function createPhysicalProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const productResponse = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: 'physical_finished'})
  });
  const [{id}] = (await productResponse.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'vi',
        title: 'Gau bong thanh pham',
        description: 'Gau bong moc san.',
        specifications: {material: 'cotton'},
        slug: `gau-bong-thanh-pham-${suffix}`,
        seo_title: 'Gau bong thanh pham',
        seo_description: 'Mua gau bong moc thu cong.'
      },
      {
        product_id: id,
        locale: 'en',
        title: 'Finished crochet bear',
        description: 'Ready-made crochet bear.',
        specifications: {material: 'cotton'},
        slug: `finished-crochet-bear-${suffix}`,
        seo_title: 'Finished crochet bear',
        seo_description: 'Buy a handmade crochet bear.'
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

  const mediaResponse = await rest('product_media', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      product_id: id,
      bucket_id: 'product-media',
      object_path: `products/${id}/variant.jpg`,
      alt_text_vi: 'Gau nau',
      alt_text_en: 'Brown bear',
      display_order: 0,
      is_primary: false
    })
  });
  const [{id: mediaId}] = (await mediaResponse.json()) as Array<{id: string}>;

  return {id, mediaId};
}

async function signIn(page: Page, user: {email: string; password: string}) {
  await page.goto('/en/sign-in?next=/admin/catalog');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
  await expect(page.getByRole('heading', {name: 'Products', exact: true})).toBeVisible();
}

async function rows<T>(path: string) {
  const response = await rest(path);
  return (await response.json()) as T[];
}

test.afterAll(async () => {
  for (const productId of createdProductIds) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
  for (const userId of createdUserIds) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: serviceHeaders
    });
    if (!response.ok) {
      throw new Error(`User cleanup failed: ${response.status} ${await response.text()}`);
    }
  }
});

test('admin edits product-level inventory for a physical product without variants', async ({page}) => {
  const product = await createPhysicalProduct();
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin);

  await page.goto(`/admin/catalog/${product.id}`);
  await expect(page.getByRole('heading', {name: 'Edit product'})).toBeVisible();
  await page.getByRole('button', {name: 'Publish product'}).click();
  await expect(page.getByRole('heading', {name: 'Publishing blocked'})).toBeVisible();
  await expect(page.getByText('Inventory', {exact: true})).toBeVisible();

  await expect(async () => {
    await page.goto(`/admin/catalog/${product.id}/variants`);
    await expect(page.getByRole('heading', {name: 'Variants and inventory'})).toBeVisible();
  }).toPass({timeout: 15_000});
  await expect(page.getByText('Product-level inventory', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Product stock quantity')).toBeVisible();
  await expect(page.getByLabel('Variant stock quantity')).toHaveCount(0);

  await page.getByLabel('Product stock quantity').fill('4');
  await page.getByRole('button', {name: 'Save product inventory'}).click();
  await expect(page.getByText('Inventory saved')).toBeVisible();

  const inventory = await rows<{product_id: string | null; variant_id: string | null; quantity_on_hand: number}>(
    `inventory_records?product_id=eq.${product.id}&select=product_id,variant_id,quantity_on_hand`
  );
  expect(inventory).toEqual([{product_id: product.id, variant_id: null, quantity_on_hand: 4}]);
});

test('admin creates, reorders, edits, removes variants, and manages variant stock and price overrides', async ({page}) => {
  const product = await createPhysicalProduct();
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin);

  await page.goto(`/admin/catalog/${product.id}/variants`);
  await page.getByRole('button', {name: 'Use explicit variants'}).click();
  await page.getByLabel('Variant SKU').fill('BEAR-BROWN-SMALL');
  await page.getByLabel('Variant attributes JSON').fill('{"size":"small","color":"brown"}');
  await page.getByLabel('Variant display order').fill('2');
  await page.getByLabel('Variant image').selectOption(product.mediaId);
  await page.getByLabel('Variant stock quantity').fill('3');
  await expect(page.getByText('VN effective price: VND 250,000 from parent')).toBeVisible();
  await expect(page.getByText('INTL effective price: $18.00 from parent')).toBeVisible();

  await page.getByLabel('Override Vietnam price').check();
  await page.getByLabel('Vietnam override in VND').fill('275000');
  await page.getByRole('button', {name: 'Save variant'}).click();
  await expect(page.getByText('Variant saved')).toBeVisible();
  await expect(page.getByText('Price override saved')).toBeVisible();
  await expect(page.getByText('Inventory saved')).toBeVisible();
  await expect(page.getByText('VN effective price: VND 275,000 from variant')).toBeVisible();
  await expect(page.getByText('INTL effective price: $18.00 from parent')).toBeVisible();

  await page.getByLabel('Variant display order').fill('1');
  await page.getByRole('button', {name: 'Save variant'}).click();
  await expect(page.getByText('Variant saved')).toBeVisible();

  const variants = await rows<{id: string; sku: string; display_order: number}>(
    `product_variants?product_id=eq.${product.id}&select=id,sku,display_order`
  );
  expect(variants).toHaveLength(1);
  expect(variants[0].sku).toBe('BEAR-BROWN-SMALL');
  expect(variants[0].display_order).toBe(1);

  const inventory = await rows<{product_id: string | null; variant_id: string | null; quantity_on_hand: number}>(
    `inventory_records?variant_id=eq.${variants[0].id}&select=product_id,variant_id,quantity_on_hand`
  );
  expect(inventory).toEqual([{product_id: null, variant_id: variants[0].id, quantity_on_hand: 3}]);

  const overrides = await rows<{market_code: string; currency_code: string; price_minor: number}>(
    `variant_market_offers?variant_id=eq.${variants[0].id}&select=market_code,currency_code,price_minor`
  );
  expect(overrides).toEqual([{market_code: 'vn', currency_code: 'VND', price_minor: 275000}]);

  await expect(page.getByLabel('Product stock quantity')).toHaveCount(0);
  await page.getByRole('button', {name: 'Remove variant'}).click();
  await expect(page.getByText('Variant removed')).toBeVisible();
});
