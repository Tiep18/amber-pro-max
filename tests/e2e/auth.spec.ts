import {expect, test} from '@playwright/test';

const commerceTerms = /cart|catalog|blog|wishlist|order|payment|download|shipping/i;

test('localized auth pages render complete accessible forms', async ({page}) => {
  await page.goto('/vi/dang-nhap?next=/vi/tai-khoan');
  await expect(page.getByRole('heading', {name: 'Dang nhap'})).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mat khau')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Tao tai khoan'})).toHaveAttribute('href', '/vi/dang-ky');
  await expect(page.getByRole('link', {name: 'Quen mat khau?'})).toHaveAttribute('href', '/vi/quen-mat-khau');
  await expect(page.getByText(commerceTerms)).toHaveCount(0);

  await page.goto('/en/register?next=/en/account');
  await expect(page.getByRole('heading', {name: 'Create account'})).toBeVisible();
  await expect(page.getByLabel('Password', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', {name: 'Sign in'})).toHaveAttribute('href', '/en/sign-in');
});

test('forgot password shows generic localized success without account enumeration', async ({page}) => {
  await page.goto('/en/forgot-password');
  await page.getByLabel('Email').fill(`missing-${Date.now()}@example.test`);
  await page.getByRole('button', {name: 'Send reset link'}).click();

  await expect(page.getByText('Check your email')).toBeVisible();
  await expect(page.getByText('If that email can receive account mail')).toBeVisible();
  await expect(page.getByText(/not found|unknown|supabase|invalid login/i)).toHaveCount(0);
});

test('invalid recovery links show localized generic reset guidance', async ({page}) => {
  await page.goto('/vi/dat-lai-mat-khau');
  await expect(page.getByRole('heading', {name: 'Chon mat khau moi'})).toBeVisible();
  await expect(page.getByText('Lien ket khoi phuc nay khong con hop le')).toBeVisible();
  await expect(page.getByLabel('Mat khau')).toHaveCount(0);
});

test('recovery marker renders reset password form with safe localized next value', async ({page}) => {
  await page.goto('/en/reset-password?recovery=1&next=/en/account');
  await expect(page.getByRole('heading', {name: 'Choose a new password'})).toBeVisible();
  await expect(page.getByLabel('Password', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue('/en/account');
});
