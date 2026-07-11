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
const createdErrorIds: string[] = [];

test.beforeAll(async () => {
  admin = await createConfirmedUser('admin');
  customer = await createConfirmedUser('customer');

  const response = await rest('operational_errors', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      area: 'payment',
      severity: 'error',
      error_code: 'paypal:capture_failed',
      summary: 'PayPal capture failed after provider verification',
      sanitized_facts: {
        provider: 'paypal',
        providerOrderId: 'ORDER-OPS-123',
        status: 'DECLINED',
        amountCurrency: 'USD'
      }
    })
  });
  const [{ id }] = (await response.json()) as Array<{ id: string }>;
  createdErrorIds.push(id);
});

test.afterAll(async () => {
  for (const errorId of createdErrorIds) {
    await rest(`operational_errors?id=eq.${errorId}`, { method: 'DELETE' });
  }
  await deleteUser(admin.id);
  await deleteUser(customer.id);
});

test.describe('admin operations error queue (OPS-03, D-11, D-12)', () => {
  test('protects the operational error queue', async ({ page }) => {
    await page.goto('/admin/operations');
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin%2Foperations/);
  });

  test('renders only sanitized operational facts and resolves an error', async ({ page }) => {
    await signIn(page, admin, '/admin/operations');
    await expect(page.getByRole('heading', { name: 'Operational errors' })).toBeVisible();
    await expect(page.getByText('PayPal capture failed after provider verification')).toBeVisible();
    await page.getByLabel('Search operational errors').fill('paypal:capture');
    await expect(page.getByText('PayPal capture failed after provider verification')).toBeVisible();
    await page.getByLabel('Search operational errors').fill('no-matching-error');
    await expect(page.getByText('No errors match this search.')).toBeVisible();
    await page.getByLabel('Search operational errors').fill('');
    await expect(
      page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)
    ).resolves.toBe(true);
    await page.getByRole('button', { name: /View details for/ }).click();
    await expect(page.getByRole('dialog', { name: 'Incident details' })).toBeVisible();
    await expect(page.getByText('Sanitized facts')).toBeVisible();
    await expect(page.getByText('ORDER-OPS-123')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(
      /buyer@example\.com|secret-token|Bearer abc|https:\/\/example\.com\/download|rawPayload/i
    );

    await page.getByRole('button', { name: 'Mark error resolved' }).click();
    await expect(page.getByText('No unresolved operational errors')).toBeVisible();

    await page.goto('/admin/operations?status=resolved&area=payment');
    await expect(page.getByText('PayPal capture failed after provider verification')).toBeVisible();
  });

  test('customer cannot access operational errors', async ({ page }) => {
    await page.goto(`/en/sign-in?next=${encodeURIComponent('/admin/operations')}`);
    await page.locator('#email').fill(customer.email);
    await page.locator('#password').fill(customer.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Operational errors' })).toHaveCount(0);
  });
});
