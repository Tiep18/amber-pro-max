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
const createdProfileNames: string[] = [];

test.afterEach(async () => {
  await Promise.all(
    createdProfileNames.splice(0).map(async (profileName) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/shipping_profiles?name=eq.${encodeURIComponent(profileName)}&select=id`,
        { headers: serviceHeaders }
      );
      if (!response.ok) throw new Error(`Profile lookup failed during cleanup: ${response.status}`);
      const profiles = (await response.json()) as Array<{ id: string }>;
      for (const profile of profiles) {
        await fetch(
          `${supabaseUrl}/rest/v1/shipping_store_defaults?shipping_profile_id=eq.${profile.id}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({ active: false })
          }
        );
        await fetch(
          `${supabaseUrl}/rest/v1/shipping_store_defaults?shipping_profile_id=eq.${profile.id}`,
          { method: 'DELETE', headers: serviceHeaders }
        );
        const deleted = await fetch(
          `${supabaseUrl}/rest/v1/shipping_profiles?id=eq.${profile.id}`,
          { method: 'DELETE', headers: serviceHeaders }
        );
        if (!deleted.ok) throw new Error(`Profile cleanup failed: ${deleted.status}`);
      }
    })
  );
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
  createdProfileNames.push(profileName);

  await page.goto('/en/sign-in?next=/admin/shipping');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL((url) => url.pathname === '/admin/shipping');
  await expect(page.getByRole('heading', { name: 'Shipping setup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Package rates' })).toBeVisible();

  await page.getByRole('button', { name: 'New package type' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Package type name').fill(profileName);
  await page
    .getByLabel('Internal description')
    .fill('Small parcel profile for US checkout coverage');
  await page.getByRole('button', { name: 'Create package type' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: profileName })).toBeVisible();

  const packageRow = page.locator('article').filter({ hasText: profileName });
  await packageRow.getByRole('button', { name: 'Set default' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Set as default' }).click();
  await expect(packageRow.getByText('Default')).toBeVisible();

  const usRate = packageRow.locator('section').filter({ hasText: 'United States' });
  await usRate.getByRole('button', { name: 'Add rate' }).click();
  const rateDialog = page.getByRole('dialog');
  await expect(rateDialog.getByText(profileName)).toBeVisible();
  await expect(rateDialog.getByText('United States')).toBeVisible();
  await expect(rateDialog.getByRole('combobox', { name: 'Package type' })).toHaveCount(0);
  await expect(rateDialog.getByRole('combobox', { name: 'Shipping destination' })).toHaveCount(0);
  await rateDialog.getByLabel('First item fee').fill('7.50');
  await rateDialog.getByLabel('Each additional item').fill('2.25');
  await rateDialog.getByRole('button', { name: 'Create shipping rate' }).click();
  await expect(rateDialog).toBeHidden();
  await expect(packageRow.getByText('$7.50')).toBeVisible();
  await expect(packageRow.getByText(/\+ \$2\.25 each additional/)).toBeVisible();

  await packageRow.getByText('Overrides', { exact: true }).click();
  await packageRow.getByRole('button', { name: 'Add state' }).click();
  const stateSelect = page.getByLabel('State or territory');
  await stateSelect.click();
  const stateSelectBox = await stateSelect.boundingBox();
  expect(stateSelectBox).not.toBeNull();
  await page.mouse.move(stateSelectBox!.x + 24, stateSelectBox!.y + stateSelectBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(20);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(stateSelect).toHaveAttribute('aria-expanded', 'false');
  await stateSelect.click();
  await page.getByRole('option', { name: 'California (CA)' }).click();
  await page.getByLabel('Adjustment type').click();
  await page.getByRole('option', { name: 'Add to the base rate' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Adjustment type').click();
  await page.locator('.sheet-overlay').click({ position: { x: 12, y: 12 } });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('First item').fill('1.25');
  await page.getByLabel('Each additional').fill('0.50');
  await page.getByRole('button', { name: 'Create US adjustment' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(packageRow.getByText('California (CA)')).toBeVisible();
  await expect(packageRow.getByText(/Add \$1\.25 first/)).toBeVisible();

  const packageActions = packageRow.getByRole('group', { name: `Actions for ${profileName}` });
  await expect(packageActions.getByRole('button', { name: 'Deactivate' })).toBeVisible();
  await expect(
    page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)
  ).resolves.toBe(true);
  await expect(page.getByText(/service_role|access_token|refresh_token/i)).toHaveCount(0);
});
