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
const createdTaxonomy: Array<{table: string; id: string}> = [];

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
  const email = `catalog-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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
      body: JSON.stringify({user_id: user.id, role: 'admin', note: 'E2E catalog admin'})
    });
  }
  return {email, password};
}

async function createTaxonomyFixture(
  table: 'categories' | 'techniques' | 'tags' | 'collections',
  translationsTable: 'category_translations' | 'technique_translations' | 'tag_translations' | 'collection_translations',
  foreignKey: 'category_id' | 'technique_id' | 'tag_id' | 'collection_id',
  name: string
) {
  const response = await rest(table, {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({})
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdTaxonomy.push({table, id});

  const localized = ['vi', 'en'].map((locale) => ({
    [foreignKey]: id,
    locale,
    name: `${name} ${locale.toUpperCase()}`,
    ...(table === 'categories' || table === 'collections'
      ? {
          slug: `${name.toLowerCase().replaceAll(' ', '-')}-${locale}`,
          description: ''
        }
      : {})
  }));
  await rest(translationsTable, {
    method: 'POST',
    body: JSON.stringify(localized)
  });

  return {id, label: `${name} EN`};
}

async function signIn(page: Page, user: {email: string; password: string}, expected: 'admin' | 'forbidden') {
  await page.goto('/en/sign-in?next=/admin/catalog');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', {name: 'Sign in'}).click();
  if (expected === 'admin') {
    await expect(page).toHaveURL(/\/admin\/catalog$/);
    await expect(page.getByRole('heading', {name: 'Products', exact: true})).toBeVisible();
  } else {
    await expect(page).toHaveURL(/\/admin\/forbidden$/);
    await expect(page.getByRole('heading', {name: 'Access denied'})).toBeVisible();
  }
}

test.afterAll(async () => {
  for (const productId of createdProductIds) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
  for (const item of createdTaxonomy.reverse()) {
    await rest(`${item.table}?id=eq.${item.id}`, {method: 'DELETE'});
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

test('admin creates and edits bilingual product basics and sees publish blockers', async ({page}) => {
  const slugSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const englishTitle = `Spring bunny pattern ${slugSuffix}`;
  const [category, technique, tag, collection] = await Promise.all([
    createTaxonomyFixture('categories', 'category_translations', 'category_id', 'Animals'),
    createTaxonomyFixture('techniques', 'technique_translations', 'technique_id', 'Amigurumi'),
    createTaxonomyFixture('tags', 'tag_translations', 'tag_id', 'Beginner'),
    createTaxonomyFixture('collections', 'collection_translations', 'collection_id', 'Spring')
  ]);
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin, 'admin');

  await page.goto('/admin/catalog/new');
  await expect(page.getByRole('heading', {name: 'New product'})).toBeVisible();
  await page.getByLabel('Product type').selectOption('pdf_pattern');

  await page.getByLabel('Vietnamese title').fill('Mau tho mua xuan');
  await page.getByLabel('Vietnamese description').fill('Huong dan moc tho.');
  await page.getByLabel('Vietnamese specifications JSON').fill('{"difficulty":"easy"}');
  await page.getByLabel('Vietnamese slug').fill(`mau-tho-mua-xuan-${slugSuffix}`);
  await page.getByLabel('Vietnamese SEO title').fill('Mau tho mua xuan');
  await page.getByLabel('Vietnamese SEO description').fill('Tai mau moc tho mua xuan.');

  await page.getByLabel('English title').fill(englishTitle);
  await page.getByLabel('English description').fill('Crochet a spring bunny.');
  await page.getByLabel('English specifications JSON').fill('{"difficulty":"easy"}');
  await page.getByLabel('English slug').fill(`spring-bunny-pattern-${slugSuffix}`);
  await page.getByLabel('English SEO title').fill('Spring bunny pattern');
  await page.getByLabel('English SEO description').fill('Download the spring bunny crochet pattern.');

  await page.getByLabel(category.label).check();
  await page.getByLabel(technique.label).check();
  await page.getByLabel(tag.label).check();
  await page.getByLabel(collection.label, {exact: true}).check();
  await page.getByLabel(`${collection.label} display order`).fill('3');

  await page.getByLabel('Vietnam market enabled').check();
  await page.getByLabel('Vietnam price in VND').fill('125000');
  await page.getByLabel('International market enabled').check();
  await page.getByLabel('International price in USD cents').fill('700');
  await page.getByRole('button', {name: 'Save draft'}).click();

  await expect(page).toHaveURL(/\/admin\/catalog\/[0-9a-f-]+(?:\?saved=1)?$/);
  const productId = new URL(page.url()).pathname.split('/').at(-1);
  expect(productId).toBeTruthy();
  createdProductIds.push(productId!);
  await expect(page.getByText('Draft saved')).toBeVisible();

  await page.getByLabel('International price in USD cents').fill('850');
  await page.getByRole('button', {name: 'Save draft'}).click();
  await expect(page.getByText('Draft saved')).toBeVisible();

  await page.getByRole('button', {name: 'Publish product'}).click();
  await expect(page.getByRole('heading', {name: 'Publishing blocked'})).toBeVisible();
  await expect(page.getByText('Primary product image')).toBeVisible();
  await expect(page.getByText('Vietnamese social image')).toBeVisible();
  await expect(page.getByText('English social image')).toBeVisible();
  await expect(page.getByText('Private PDF')).toBeVisible();

  await expect(page.getByRole('link', {name: 'Manage media and PDF'})).toHaveAttribute(
    'href',
    `/admin/catalog/${productId}/media`
  );
  await expect(page.getByRole('link', {name: 'Manage variants and inventory'})).toHaveAttribute(
    'href',
    `/admin/catalog/${productId}/variants`
  );

  await page.goto('/admin/catalog');
  await expect(page.getByText(englishTitle)).toBeVisible();
  await expect(page.getByRole('link', {name: new RegExp(`${englishTitle}.*draft`)})).toBeVisible();
});

test('customer cannot access the product editor', async ({page}) => {
  const customer = await createConfirmedUser();
  await signIn(page, customer, 'forbidden');

  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await page.goto('/admin/catalog/new');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('heading', {name: 'New product'})).toHaveCount(0);
});
