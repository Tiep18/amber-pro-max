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
  await expect(page.getByRole('heading', {name: 'Product inventory'})).toBeVisible();
  await expect(page.getByLabel('Product stock quantity')).toBeVisible();
  await expect(page.getByLabel('Variant stock quantity')).toHaveCount(0);

  await page.getByLabel('Product stock quantity').fill('4');
  await page.getByRole('button', {name: 'Save product inventory'}).click();
  await expect(page.getByText('Inventory saved')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Current product stock is 4')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Use explicit variants'})).toBeDisabled();

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
  await page.getByLabel('Attribute 1 name').fill('size');
  await page.getByLabel('Attribute 1 value').fill('small');
  await page.getByRole('button', {name: 'Add attribute'}).click();
  await page.getByLabel('Attribute 2 name').fill('color');
  await page.getByLabel('Attribute 2 value').fill('brown');
  await page.getByLabel('Variant display order').fill('2');
  await page.getByLabel('Variant image').selectOption(product.mediaId);
  await page.getByLabel('Quantity on hand').fill('3');
  await expect(page.getByText('VND 250,000')).toBeVisible();
  await expect(page.getByText('$18.00')).toBeVisible();

  const vietnam = page.getByRole('group', {name: 'Vietnam availability and pricing'});
  const international = page.getByRole('group', {name: 'International availability and pricing'});
  await vietnam.getByRole('radio', {name: 'Custom price'}).click();
  await page.getByLabel('Vietnam price · Amount in đồng').fill('275000');
  await international.getByRole('radio', {name: 'Unavailable'}).click();
  await page.getByRole('button', {name: 'Save variant'}).click();
  await expect(page.getByText('Variant saved')).toBeVisible();
  await expect(vietnam.getByText('VND 275,000')).toBeVisible();
  await expect(international.getByText('Unavailable', {exact: true})).toBeVisible();

  await page.getByLabel('Variant SKU').fill('BEAR-BROWN-DIRTY');
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', {cancelable: true});
      window.dispatchEvent(event);
      return event.defaultPrevented;
    })
  ).toBe(true);
  await page.getByRole('button', {name: '+ New variant'}).click();
  await expect(page.getByRole('heading', {name: 'Discard unsaved changes?'})).toBeVisible();
  await page.getByRole('button', {name: 'Cancel'}).click();
  await expect(page.getByLabel('Variant SKU')).toHaveValue('BEAR-BROWN-DIRTY');
  await page.getByRole('button', {name: '+ New variant'}).click();
  await page.getByRole('button', {name: 'Discard changes'}).click();
  await expect(page.getByText('Enter a SKU.')).toBeVisible();
  await expect(page.getByText('Enter an attribute name.')).toBeVisible();
  await expect(page.getByText('Enter an attribute value.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save variant'})).toBeDisabled();
  await page.getByLabel('Variant SKU').fill('BEAR-CREAM-MEDIUM');
  await page.getByLabel('Attribute 1 name').fill('color');
  await page.getByLabel('Attribute 1 value').fill('cream');
  await page.getByLabel('Variant display order').fill('1');
  await page.getByLabel('Quantity on hand').fill('5');
  await page.getByRole('button', {name: 'Save variant'}).click();
  await expect(page.getByText('Variant saved')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', {cancelable: true});
      window.dispatchEvent(event);
      return event.defaultPrevented;
    })
  ).toBe(false);
  await expect(page.getByRole('button', {name: 'BEAR-BROWN-SMALL'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'BEAR-CREAM-MEDIUM'})).toBeVisible();

  await page.getByRole('button', {name: 'BEAR-BROWN-SMALL'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', {name: 'BEAR-BROWN-SMALL'})).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Variant display order').fill('0');
  await page.getByRole('button', {name: 'Save variant'}).click();
  await expect(page.getByText('Variant saved')).toBeVisible();

  const variants = await rows<{id: string; sku: string; display_order: number}>(
    `product_variants?product_id=eq.${product.id}&select=id,sku,display_order`
  );
  expect(variants).toHaveLength(2);
  expect(variants.find((variant) => variant.sku === 'BEAR-BROWN-SMALL')?.display_order).toBe(0);
  expect(variants.find((variant) => variant.sku === 'BEAR-CREAM-MEDIUM')?.display_order).toBe(1);
  const brownVariant = variants.find((variant) => variant.sku === 'BEAR-BROWN-SMALL');
  expect(brownVariant).toBeDefined();

  const inventory = await rows<{product_id: string | null; variant_id: string | null; quantity_on_hand: number}>(
    `inventory_records?variant_id=eq.${brownVariant?.id}&select=product_id,variant_id,quantity_on_hand`
  );
  expect(inventory).toEqual([{product_id: null, variant_id: brownVariant?.id, quantity_on_hand: 3}]);

  const overrides = await rows<{market_code: string; enabled: boolean; currency_code: string; price_minor: number}>(
    `variant_market_offers?variant_id=eq.${brownVariant?.id}&select=market_code,enabled,currency_code,price_minor&order=market_code`
  );
  expect(overrides).toEqual([
    {market_code: 'intl', enabled: false, currency_code: 'USD', price_minor: 0},
    {market_code: 'vn', enabled: true, currency_code: 'VND', price_minor: 275000}
  ]);

  await expect(page.getByLabel('Product stock quantity')).toHaveCount(0);
  await page.getByRole('button', {name: 'Remove', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Remove BEAR-BROWN-SMALL?'})).toBeVisible();
  await page.getByRole('button', {name: 'Remove variant'}).click();
  await expect(page.getByText('Variant removed')).toBeVisible();

  await page.getByRole('button', {name: 'Remove', exact: true}).click();
  await page.getByRole('button', {name: 'Remove variant'}).click();
  await expect(page.getByText('Variant removed')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Product inventory'})).toBeVisible();
  await expect(page.getByLabel('Product stock quantity')).toHaveValue('0');

  await page.setViewportSize({width: 375, height: 812});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
