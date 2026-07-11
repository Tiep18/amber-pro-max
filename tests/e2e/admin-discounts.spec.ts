import { expect, test } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const createdUserIds: string[] = [];
const createdDiscountCodes: string[] = [];

test.afterEach(async () => {
  await Promise.all(
    createdDiscountCodes.splice(0).map(async (code) => {
      await fetch(`${supabaseUrl}/rest/v1/discount_codes?code=eq.${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: serviceHeaders
      });
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
  const email = `discount-admin-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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
    body: JSON.stringify({ user_id: user.id, role: 'admin', note: 'E2E discount admin' })
  });
  if (!roleResponse.ok) {
    throw new Error(`Role assignment failed: ${roleResponse.status} ${await roleResponse.text()}`);
  }

  return { email, password };
}

test('admin creates a reusable discount code with market and schedule preview', async ({
  page
}) => {
  const admin = await createAdmin();
  const code = `SAVE${Date.now().toString().slice(-6)}`;
  createdDiscountCodes.push(code);

  await page.goto('/en/sign-in?next=/admin/discounts');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/discounts$/);
  await expect(page.getByRole('heading', { name: 'Discount codes' })).toBeVisible();
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('Description').fill('Launch discount');
  await page.getByRole('button', { name: 'Percentage' }).click();
  await page.getByRole('textbox', { name: 'Percentage' }).fill('10');
  await page.getByLabel('Market').selectOption('intl');
  await page.getByLabel('Minimum subtotal').fill('20.00');
  await page.getByLabel('Usage limit').fill('25');
  await page.getByRole('button', { name: 'Create discount' }).click();

  const discountRow = page.getByRole('row').filter({ hasText: code });
  await expect(discountRow).toBeVisible();
  await expect(discountRow.getByText('10% off')).toBeVisible();
  await expect(discountRow.getByText('International')).toBeVisible();
  await expect(discountRow.getByText('Min. $20.00')).toBeVisible();
  await expect(discountRow.getByRole('button', { name: 'Disable' })).toBeVisible();
  await expect(page.getByText(/service_role|access_token|refresh_token/i)).toHaveCount(0);
});
