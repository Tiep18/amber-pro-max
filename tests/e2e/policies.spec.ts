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
let customer: E2EUser;
const createdPolicyIds: string[] = [];

test.beforeAll(async () => {
  admin = await createConfirmedUser('admin');
  customer = await createConfirmedUser('customer');
});

test.afterAll(async () => {
  for (const policyId of createdPolicyIds) {
    await rest(`policy_pages?id=eq.${policyId}`, { method: 'DELETE' });
  }
  await deleteUser(admin.id);
  await deleteUser(customer.id);
});

async function rememberPolicyBySlug(slug: string) {
  const response = await rest(`policy_page_translations?slug=eq.${slug}&select=policy_id`);
  const rows = (await response.json()) as Array<{ policy_id: string }>;
  if (rows[0]?.policy_id) {
    createdPolicyIds.push(rows[0].policy_id);
  }
}

test.describe('policy publishing (LEGAL-01, D-13, D-16)', () => {
  test('protects the admin policy editor', async ({ page }) => {
    await page.goto('/admin/policies');
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin%2Fpolicies/);
  });

  test('admin publishes bilingual policy pages and drafts stay private', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const enSlug = `privacy-policy-${suffix}`;
    const viSlug = `chinh-sach-rieng-tu-${suffix}`;

    await signIn(page, admin, '/admin/policies');
    await expect(page.getByRole('heading', { name: 'Policy publishing' })).toBeVisible();

    const privacy = page.getByRole('region', { name: 'Privacy policy' });
    await privacy.getByLabel('Vietnamese title').fill('Chinh sach rieng tu');
    await privacy.getByLabel('Vietnamese slug').fill(viSlug);
    await privacy.getByLabel('Vietnamese summary').fill('Tom tat chinh sach rieng tu.');
    await privacy.getByLabel('Vietnamese seoTitle').fill('Chinh sach rieng tu');
    await privacy.getByLabel('Vietnamese seoDescription').fill('Thong tin ve quyen rieng tu.');
    await privacy.getByText('Advanced social image storage').click();
    await privacy.getByLabel('Vietnamese socialImageBucket').fill('policy-media');
    await privacy.getByLabel('Vietnamese socialImagePath').fill('policy/privacy-vi.jpg');
    await privacy
      .getByLabel('Vietnamese body')
      .fill('Noi dung chinh sach rieng tu cho khach hang.');

    await privacy.getByRole('tab', { name: /English/ }).click();
    await privacy.getByLabel('English title').fill('Privacy policy');
    await privacy.getByLabel('English slug').fill(enSlug);
    await privacy.getByLabel('English summary').fill('Privacy policy summary.');
    await privacy.getByLabel('English seoTitle').fill('Privacy policy');
    await privacy.getByLabel('English seoDescription').fill('How customer privacy is handled.');
    await privacy.getByLabel('English socialImageBucket').fill('policy-media');
    await privacy.getByLabel('English socialImagePath').fill('policy/privacy-en.jpg');
    await privacy.getByLabel('English body').fill('Privacy policy body for customers.');

    await privacy.getByRole('button', { name: 'Save policy' }).click();
    await expect(privacy.getByText('Policy saved')).toBeVisible();
    await rememberPolicyBySlug(enSlug);

    await page.goto(`/en/policies/${enSlug}`);
    await expect(page.getByRole('heading', { name: 'Privacy policy' })).toHaveCount(0);

    await page.goto('/admin/policies');
    await page
      .getByRole('region', { name: 'Privacy policy' })
      .getByRole('button', { name: 'Publish policy', exact: true })
      .click();
    await expect(page.getByText('Policy published')).toBeVisible();

    await page.goto(`/en/policies/${enSlug}`);
    await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByText('Privacy policy body for customers.')).toBeVisible();

    await page.goto(`/vi/chinh-sach/${viSlug}`);
    await expect(page.getByRole('heading', { name: 'Chinh sach rieng tu' })).toBeVisible();
    await expect(page.getByText('Noi dung chinh sach rieng tu cho khach hang.')).toBeVisible();
  });

  test('customer cannot access policy publishing admin', async ({ page }) => {
    await page.goto(`/en/sign-in?next=${encodeURIComponent('/admin/policies')}`);
    await page.locator('#email').fill(customer.email);
    await page.locator('#password').fill(customer.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Policy publishing' })).toHaveCount(0);
  });
});
