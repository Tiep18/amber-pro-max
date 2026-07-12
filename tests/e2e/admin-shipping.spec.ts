import { expect, test } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const createdUserIds: string[] = [];

test.afterEach(async () => {
  await Promise.all(
    createdUserIds.splice(0).map(async (userId) => {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: serviceHeaders
      });
    })
  );
});

async function createAdmin() {
  const email = `shipping-admin-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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

  const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
    method: 'POST',
    headers: { ...serviceHeaders, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: user.id, role: 'admin', note: 'E2E shipping admin' })
  });
  if (!roleResponse.ok) {
    throw new Error(`Role assignment failed: ${roleResponse.status} ${await roleResponse.text()}`);
  }

  return { email, password };
}

test('admin manages parcel default, destination rule, and US adjustment', async ({ page }) => {
  const admin = await createAdmin();
  const profileName = `US small parcel ${Date.now()}`;

  await page.goto('/en/sign-in?next=/admin/shipping');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/shipping$/);
  await expect(page.getByRole('heading', { name: 'Shipping profiles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Parcel profiles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Destination rules' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'US region adjustments' })).toBeVisible();

  await page.getByRole('button', { name: 'New profile' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Profile name').fill(profileName);
  await page.getByLabel('Description').fill('Small parcel profile for US checkout coverage');
  await page.getByRole('button', { name: 'Create shipping profile' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: profileName })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('article')
    .filter({ hasText: profileName })
    .getByRole('button', { name: 'Set as default' })
    .click();
  await expect(
    page.locator('article').filter({ hasText: profileName }).getByText('Default')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add rule' }).click();
  await page.getByLabel('Parcel profile').click();
  await page.getByRole('option', { name: profileName }).click();
  await page.getByLabel('Country code').fill('US');
  await page.getByLabel('First item fee').fill('7.50');
  await page.getByLabel('Additional item fee').fill('2.25');
  await page.getByRole('button', { name: 'Save destination rule' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('$7.50 first / $2.25 additional').last()).toBeVisible();

  await page.getByRole('button', { name: 'Add US adjustment' }).click();
  await page.getByLabel('Destination rule').click();
  await page.getByRole('option', { name: new RegExp(`${profileName}.*US.*USD`) }).click();
  await page.getByLabel('State or territory').click();
  await page.getByRole('option', { name: 'California (CA)' }).click();
  await page.getByLabel('Adjustment type').click();
  await page.getByRole('option', { name: 'Add surcharge' }).click();
  await page.getByLabel('First item').fill('1.25');
  await page.getByLabel('Each additional item').fill('0.50');
  await page.getByRole('button', { name: 'Save US adjustment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const adjustmentsSection = page.locator('section').filter({ hasText: 'US region adjustments' });
  const adjustmentRow = adjustmentsSection.locator('article').filter({ hasText: profileName });
  await expect(adjustmentRow.getByText('CA', { exact: true })).toBeVisible();
  await expect(adjustmentRow.getByText('Add surcharge')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Deactivate' }).first()).toBeVisible();
  await expect(
    page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true);
  await expect(page.getByText(/service_role|access_token|refresh_token/i)).toHaveCount(0);
});
