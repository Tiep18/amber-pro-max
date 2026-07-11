import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

test.describe.configure({ mode: 'serial' });

const createdUserIds: string[] = [];
const createdPostIds: string[] = [];
const createdTaxonomy: Array<{ table: string; id: string }> = [];

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

async function createConfirmedUser(role?: 'admin') {
  const email = `blog-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'secure-password-123';
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  if (!response.ok) {
    throw new Error(`User creation failed: ${response.status} ${await response.text()}`);
  }

  const user = (await response.json()) as { id: string };
  createdUserIds.push(user.id);
  if (role === 'admin') {
    await rest('user_roles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: user.id, role: 'admin', note: 'E2E blog admin' })
    });
  }
  return { email, password };
}

async function createBlogTaxonomyFixture(
  table: 'blog_categories' | 'blog_tags',
  translationsTable: 'blog_category_translations' | 'blog_tag_translations',
  foreignKey: 'category_id' | 'tag_id',
  name: string
) {
  const response = await rest(table, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({})
  });
  const [{ id }] = (await response.json()) as Array<{ id: string }>;
  createdTaxonomy.push({ table, id });

  const localized = ['vi', 'en'].map((locale) => ({
    [foreignKey]: id,
    locale,
    name: `${name} ${locale.toUpperCase()}`,
    slug: `${name.toLowerCase().replaceAll(' ', '-')}-${locale}`,
    ...(table === 'blog_categories' ? { description: '' } : {})
  }));
  await rest(translationsTable, {
    method: 'POST',
    body: JSON.stringify(localized)
  });

  return { id, label: `${name} EN` };
}

async function signIn(
  page: Page,
  user: { email: string; password: string },
  expected: 'admin' | 'forbidden'
) {
  await page.goto('/en/sign-in?next=/admin/blog');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  if (expected === 'admin') {
    await expect(page).toHaveURL(/\/admin\/blog$/);
    await expect(page.getByRole('heading', { name: 'Blog posts', exact: true })).toBeVisible();
  } else {
    await expect(page).toHaveURL(/\/admin\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  }
}

test.afterAll(async () => {
  for (const postId of createdPostIds) {
    await rest(`blog_posts?id=eq.${postId}`, { method: 'DELETE' });
  }
  for (const item of createdTaxonomy.reverse()) {
    await rest(`${item.table}?id=eq.${item.id}`, { method: 'DELETE' });
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

test('admin creates a bilingual blog draft and sees publish blockers', async ({ page }) => {
  const slugSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const englishTitle = `Crochet care notes ${slugSuffix}`;
  const [category, tag] = await Promise.all([
    createBlogTaxonomyFixture(
      'blog_categories',
      'blog_category_translations',
      'category_id',
      'Guides'
    ),
    createBlogTaxonomyFixture('blog_tags', 'blog_tag_translations', 'tag_id', 'Care')
  ]);
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin, 'admin');

  await page.goto('/admin/blog/new');
  await expect(page.getByRole('heading', { name: 'New blog post' })).toBeVisible();

  await page.getByLabel('Category').click();
  await page.getByRole('option', { name: category.label }).click();
  await page.getByLabel('Vietnamese title').fill('Ghi chu cham soc len');
  await page.getByLabel('Vietnamese slug').fill(`ghi-chu-cham-soc-len-${slugSuffix}`);
  await page.getByLabel('Vietnamese description').fill('Cach giu thu bong moc sach va ben.');
  await page.getByLabel('Vietnamese body').fill('Noi dung huong dan cham soc thu bong moc.');
  await page.getByLabel('Vietnamese SEO title').fill('Cham soc do moc');
  await page.getByLabel('Vietnamese SEO description').fill('Huong dan cham soc thu bong moc.');

  await page.getByRole('tab', { name: /English/ }).click();
  await page.getByLabel('English title').fill(englishTitle);
  await page.getByLabel('English slug').fill(`crochet-care-notes-${slugSuffix}`);
  await page.getByLabel('English description').fill('How to keep crochet toys clean and sturdy.');
  await page.getByLabel('English body').fill('Care instructions for handmade crochet toys.');
  await page.getByLabel('English SEO title').fill('Crochet care notes');
  await page.getByLabel('English SEO description').fill('Care notes for handmade crochet toys.');

  await page.getByLabel(tag.label).check();
  await page.getByRole('button', { name: 'Save draft' }).click();

  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]+(?:\?saved=1)?$/);
  const postId = new URL(page.url()).pathname.split('/').at(-1);
  expect(postId).toBeTruthy();
  createdPostIds.push(postId!);
  await expect(page.getByText('Draft saved')).toBeVisible();

  await page.getByRole('button', { name: 'Publish post' }).click();
  await expect(page.getByRole('heading', { name: 'Publishing blocked' })).toBeVisible();
  await expect(page.getByText('Vietnamese social image', { exact: true })).toBeVisible();
  await expect(page.getByText('English social image', { exact: true })).toBeVisible();

  await page.goto('/admin/blog');
  await expect(page.getByText(englishTitle)).toBeVisible();
  await expect(page.getByRole('link', { name: `Edit ${englishTitle}` })).toBeVisible();
  await expect(
    page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true);
});

test('customer cannot access the blog editor', async ({ page }) => {
  const customer = await createConfirmedUser();
  await signIn(page, customer, 'forbidden');

  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await page.goto('/admin/blog/new');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('heading', { name: 'New blog post' })).toHaveCount(0);
});
