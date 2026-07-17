import { expect, test } from '@playwright/test';
import {
  createConfirmedUser,
  deleteUser,
  rest,
  signIn,
  type E2EUser
} from './fixtures/authenticated-users';

test.describe.configure({ mode: 'serial' });

let admin: E2EUser;
const createdCategoryIds: string[] = [];

async function createCategory(name: string, slug: string) {
  const response = await rest('categories', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({})
  });
  const [{ id }] = (await response.json()) as Array<{ id: string }>;
  createdCategoryIds.push(id);
  await rest('category_translations', {
    method: 'POST',
    body: JSON.stringify(
      (['vi', 'en'] as const).map((locale) => ({
        category_id: id,
        locale,
        name: `${name} ${locale.toUpperCase()}`,
        slug: `${slug}-${locale}`,
        description: '',
        seo_title: null,
        seo_description: null
      }))
    )
  });
  return id;
}

test.beforeAll(async () => {
  admin = await createConfirmedUser('admin');
  await createCategory('Workspace fixture', `workspace-fixture-${Date.now()}`);
});

test.afterAll(async () => {
  for (const id of createdCategoryIds.reverse()) {
    await rest(`category_translations?category_id=eq.${id}`, { method: 'DELETE' });
    await rest(`categories?id=eq.${id}`, { method: 'DELETE' });
  }
  await deleteUser(admin.id);
});

test('admin searches, validates, creates, and reopens a bilingual taxonomy item', async ({
  page
}) => {
  await signIn(page, admin, '/admin/catalog/taxonomy');

  await expect(page.getByRole('heading', { name: 'Catalog taxonomy' })).toBeVisible();
  await expect(page.getByRole('complementary')).toBeVisible();
  await page.getByLabel('Search Product categories').fill('Workspace fixture');
  await page.getByRole('button', { name: /Workspace fixture EN/ }).click();
  await expect(page.getByRole('heading', { name: 'Workspace fixture EN' })).toBeVisible();
  await expect(page.getByText('Not used anywhere yet.')).toBeVisible();

  await page.getByRole('button', { name: 'New item' }).click();
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByText('Name is required.')).toBeVisible();
  await expect(page.getByText('Slug is required.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/catalog\/taxonomy$/);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const englishName = `Seasonal friends ${suffix}`;
  await page.getByLabel('Name').fill(`Ban theo mua ${suffix}`);
  await page.getByLabel('Slug').fill(`ban-theo-mua-${suffix}`);
  await page.getByRole('tab', { name: /English/ }).click();
  await page.getByLabel('Name').fill(englishName);
  await page.getByLabel('Slug').fill(`seasonal-friends-${suffix}`);
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page).toHaveURL(/\/admin\/catalog\/taxonomy$/);
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Taxonomy item saved.' })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Taxonomy item saved.' })
  ).toHaveCount(0);

  const lookup = await rest(
    `category_translations?locale=eq.en&slug=eq.seasonal-friends-${suffix}&select=category_id`
  );
  const [{ category_id: createdId }] = (await lookup.json()) as Array<{ category_id: string }>;
  createdCategoryIds.push(createdId);

  await page.getByLabel('Search Product categories').fill(englishName);
  await page.getByRole('button', { name: new RegExp(englishName) }).click();
  await expect(page.getByRole('heading', { name: englishName })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete item' })).toBeEnabled();
});
