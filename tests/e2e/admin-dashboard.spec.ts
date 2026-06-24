import {expect, test} from '@playwright/test';
import {createConfirmedUser, deleteUser, signIn, type E2EUser} from './fixtures/authenticated-users';

test.describe.configure({mode: 'serial'});

let admin: E2EUser;

test.beforeAll(async () => {
  admin = await createConfirmedUser('admin');
});

test.afterAll(async () => {
  await deleteUser(admin.id);
});

test('ADM-01 protects the admin dashboard', async ({page}) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin/);
});

test('ADM-01 D-09 D-10 D-12 renders actionable admin areas', async ({page}) => {
  await signIn(page, admin, '/admin');

  await expect(page.getByRole('heading', {name: 'Operational dashboard'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Admin navigation'}).getByRole('link', {name: 'Launch'})).toHaveAttribute(
    'href',
    '/admin/launch'
  );
  await expect(page.getByRole('link', {name: /Payment orders/})).toHaveAttribute('href', '/admin/orders');
  await expect(page.getByRole('link', {name: /Pending reviews/})).toHaveAttribute('href', '/admin/reviews?status=pending');
  await expect(page.getByRole('link', {name: /Launch blockers/})).toHaveAttribute('href', '/admin/launch');
});
