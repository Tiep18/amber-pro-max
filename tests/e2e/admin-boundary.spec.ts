import {expect, test} from '@playwright/test';

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

async function createConfirmedUser(role?: 'admin') {
  const email = `boundary-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'secure-password-123';
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });

  if (!response.ok) {
    throw new Error(`User creation failed: ${response.status} ${await response.text()}`);
  }

  const user = (await response.json()) as {id: string};
  createdUserIds.push(user.id);

  if (role === 'admin') {
    const roleResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        ...serviceHeaders,
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: user.id,
        role: 'admin',
        note: 'E2E admin boundary user'
      })
    });
    if (!roleResponse.ok) {
      throw new Error(`Role assignment failed: ${roleResponse.status} ${await roleResponse.text()}`);
    }
  }

  return {email, password};
}

test('anonymous account and admin requests redirect before protected shell render', async ({page}) => {
  await page.goto('/vi/tai-khoan');
  await expect(page).toHaveURL(/\/vi\/dang-nhap\?next=%2Fvi%2Ftai-khoan$/);
  await expect(page.getByRole('heading', {name: 'Dang nhap'})).toBeVisible();

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin$/);
  await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();
  await expect(page.getByText('Admin boundary')).toHaveCount(0);
});

test('signed-in customer can enter account and sign out', async ({page}) => {
  const customer = await createConfirmedUser();

  await page.goto('/vi/dang-nhap?next=/vi/tai-khoan');
  await page.getByLabel('Email').fill(customer.email);
  await page.getByLabel('Mat khau').fill(customer.password);
  await page.getByRole('button', {name: 'Dang nhap'}).click();

  await expect(page).toHaveURL(/\/vi\/tai-khoan$/);
  await expect(page.getByRole('heading', {name: 'Tai khoan'})).toBeVisible();
  await expect(page.getByText(customer.email)).toBeVisible();
  await expect(page.getByText(/user_roles|access_token|refresh_token|service_role/i)).toHaveCount(0);

  await page.getByRole('button', {name: 'Dang xuat'}).click();
  await expect(page).toHaveURL(/\/vi$/);
});

test('signed-in customer is denied admin shell server-side', async ({page}) => {
  const customer = await createConfirmedUser();

  await page.goto('/en/sign-in?next=/admin');
  await page.getByLabel('Email').fill(customer.email);
  await page.getByLabel('Password').fill(customer.password);
  await page.getByRole('button', {name: 'Sign in'}).click();

  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('heading', {name: 'Access denied'})).toBeVisible();
  await expect(page.getByText('Admin boundary')).toHaveCount(0);
});

test('database-owned admin role can enter admin shell', async ({page}) => {
  const admin = await createConfirmedUser('admin');

  await page.goto('/en/sign-in?next=/admin');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', {name: 'Sign in'}).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', {name: 'Operational dashboard'})).toBeVisible();
  await expect(page.getByText('Admin work queue')).toBeVisible();
  await expect(page.getByText(admin.email)).toHaveCount(0);
  await expect(page.getByText(/project|token|service key|provider payload/i)).toHaveCount(0);
});
