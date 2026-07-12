import { expect, test } from '@playwright/test';
import {
  createConfirmedUser,
  deleteUser,
  rest,
  signIn,
  type E2EUser
} from './fixtures/authenticated-users';

test.describe.configure({ mode: 'serial' });

const createdUsers: E2EUser[] = [];
const createdProductIds: string[] = [];
const createdProfileIds: string[] = [];

async function jsonRows<T>(path: string) {
  const response = await rest(path);
  return (await response.json()) as T[];
}

async function insertRows<T>(path: string, body: unknown) {
  const response = await rest(path, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return (await response.json()) as T[];
}

async function patchRows(path: string, body: unknown) {
  await rest(path, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

async function deleteRows(path: string) {
  await rest(path, { method: 'DELETE' });
}

async function createShippingProfile(name: string) {
  const [profile] = await insertRows<{ id: string }>('shipping_profiles', {
    name,
    description: 'E2E parcel assignment profile',
    active: true
  });
  createdProfileIds.push(profile.id);
  return profile.id;
}

async function createPhysicalProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const [product] = await insertRows<{ id: string }>('products', {
    product_type: 'physical_finished'
  });
  createdProductIds.push(product.id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: product.id,
        locale: 'vi',
        title: 'Gau moc shipping',
        description: 'San pham test shipping.',
        specifications: { material: 'cotton' },
        slug: `gau-moc-shipping-${suffix}`,
        seo_title: 'Gau moc shipping',
        seo_description: 'San pham test shipping.'
      },
      {
        product_id: product.id,
        locale: 'en',
        title: 'Shipping assignment bear',
        description: 'Shipping assignment test product.',
        specifications: { material: 'cotton' },
        slug: `shipping-assignment-bear-${suffix}`,
        seo_title: 'Shipping assignment bear',
        seo_description: 'Shipping assignment test product.'
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: product.id,
        market_code: 'vn',
        currency_code: 'VND',
        enabled: true,
        price_minor: 250000
      },
      {
        product_id: product.id,
        market_code: 'intl',
        currency_code: 'USD',
        enabled: true,
        price_minor: 1800
      }
    ])
  });

  const [variant] = await insertRows<{ id: string }>('product_variants', {
    product_id: product.id,
    sku: `SHIP-BEAR-${suffix}`,
    attributes: { size: 'small', color: 'brown' },
    display_order: 1
  });

  return { productId: product.id, variantId: variant.id };
}

test.afterAll(async () => {
  for (const productId of createdProductIds) {
    await deleteRows(`products?id=eq.${productId}`);
  }
  for (const profileId of createdProfileIds) {
    await patchRows(`shipping_store_defaults?shipping_profile_id=eq.${profileId}`, { active: false });
    await deleteRows(`shipping_store_defaults?shipping_profile_id=eq.${profileId}`);
    await deleteRows(`shipping_profiles?id=eq.${profileId}`);
  }
  for (const user of createdUsers) {
    await deleteUser(user.id);
  }
});

test('admin assigns product and variant parcel profiles with inheritance', async ({ page }) => {
  test.setTimeout(90_000);
  const admin = await createConfirmedUser('admin');
  createdUsers.push(admin);
  const defaultProfileName = `Assignment default ${Date.now()}`;
  const productProfileName = `Assignment product ${Date.now()}`;
  const variantProfileName = `Assignment variant ${Date.now()}`;
  const defaultProfileId = await createShippingProfile(defaultProfileName);
  const productProfileId = await createShippingProfile(productProfileName);
  await createShippingProfile(variantProfileName);
  const { productId, variantId } = await createPhysicalProduct();

  await patchRows('shipping_store_defaults?active=eq.true', { active: false });
  await rest('shipping_store_defaults', {
    method: 'POST',
    body: JSON.stringify({ shipping_profile_id: defaultProfileId, active: true })
  });

  await signIn(page, admin, `/admin/catalog/${productId}`);
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible();
  await expect(page.getByText(defaultProfileName)).toBeVisible();
  await expect(page.getByText('Store default')).toBeVisible();

  await page.getByRole('button', { name: 'Change parcel profile' }).click();
  await page.getByLabel('Parcel profile assignment').click();
  await page.getByRole('option', { name: productProfileName }).click();
  await expect(page.getByText('Source: Product')).toBeVisible();
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(productProfileName)).toBeVisible();
  await expect(page.getByText('Product', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Change parcel profile' }).click();
  await page.getByLabel('Parcel profile assignment').click();
  await page.getByRole('option', { name: 'Store default' }).click();
  await expect(page.getByText('Source: Store default')).toBeVisible();
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(defaultProfileName)).toBeVisible();

  await page.getByRole('button', { name: 'Change parcel profile' }).click();
  await page.getByLabel('Parcel profile assignment').click();
  await page.getByRole('option', { name: productProfileName }).click();
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(productProfileName)).toBeVisible();

  await page.goto(`/admin/catalog/${productId}/variants`);
  await expect(page.getByRole('heading', { name: 'Variants and inventory' })).toBeVisible();
  await expect(page.getByText(productProfileName)).toBeVisible();
  await expect(page.getByText('Product', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Change parcel profile' }).click();
  await page.getByLabel('Parcel profile assignment').click();
  await page.getByRole('option', { name: variantProfileName }).click();
  await expect(page.getByText('Source: Variant override')).toBeVisible();
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(variantProfileName)).toBeVisible();
  await expect(page.getByText('Variant override', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Change parcel profile' }).click();
  await page.getByLabel('Parcel profile assignment').click();
  await page.getByRole('option', { name: 'Inherit product / Store default' }).click();
  await expect(page.getByText(productProfileName)).toBeVisible();
  await expect(page.getByText('Source: Product')).toBeVisible();
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(productProfileName)).toBeVisible();
  await expect(page.getByText('Product', { exact: true })).toBeVisible();

  const productAssignments = await jsonRows<{ product_id: string; profile_id: string }>(
    `product_shipping_profiles?product_id=eq.${productId}&select=product_id,profile_id`
  );
  expect(productAssignments).toEqual([{ product_id: productId, profile_id: productProfileId }]);

  const variantAssignments = await jsonRows<{ variant_id: string; profile_id: string }>(
    `variant_shipping_profiles?variant_id=eq.${variantId}&select=variant_id,profile_id`
  );
  expect(variantAssignments).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/admin/catalog/${productId}/variants`);
  await expect(page.getByRole('button', { name: 'Change parcel profile' })).toBeVisible();
  await expect(page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).resolves.toBe(true);
  const targetBox = await page.getByRole('button', { name: 'Change parcel profile' }).boundingBox();
  expect(targetBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});
