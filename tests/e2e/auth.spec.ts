import {expect, test} from '@playwright/test';

const commerceTerms = /cart|catalog|blog|wishlist|order|payment|download|shipping/i;

test.describe.configure({mode: 'serial'});

test('localized auth pages render complete accessible forms', async ({page}) => {
  await page.goto('/vi/dang-nhap?next=/vi/tai-khoan');
  await expect(page.getByRole('heading', {name: 'Đăng nhập'})).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Tạo tài khoản'})).toHaveAttribute('href', '/vi/dang-ky');
  await expect(page.getByRole('link', {name: 'Quên mật khẩu?'})).toHaveAttribute('href', '/vi/quen-mat-khau');
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

test('registration submission shows localized verification-pending copy', async ({page}) => {
  const email = `buyer-${Date.now()}@example.com`;

  await page.goto('/en/register?next=/en/account');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', {exact: true}).fill('secure-password-123');
  await page.getByLabel('Confirm password').fill('secure-password-123');
  await page.getByRole('button', {name: 'Create account'}).click();

  await expect(page.getByText('Check your email')).toBeVisible();
  await expect(page.getByText('If confirmation is required')).toBeVisible();
});

test('invalid sign in shows a localized generic error', async ({page}) => {
  await page.goto('/vi/dang-nhap');
  await page.getByLabel('Email').fill(`missing-${Date.now()}@example.com`);
  await page.getByLabel('Mật khẩu').fill('secure-password-123');
  await page.getByRole('button', {name: 'Đăng nhập'}).click();

  await expect(page.locator('#auth-form-error')).toContainText('Yêu cầu chưa hoàn tất');
  await expect(page.getByText(/invalid login|supabase|not found/i)).toHaveCount(0);
});

test('invalid recovery links show localized generic reset guidance', async ({page}) => {
  await page.goto('/vi/dat-lai-mat-khau');
  await expect(page.getByRole('heading', {name: 'Chọn mật khẩu mới'})).toBeVisible();
  await expect(page.getByText('Liên kết khôi phục này không còn hợp lệ')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toHaveCount(0);
});

test('recovery marker renders reset password form with safe localized next value', async ({page}) => {
  await page.goto('/en/reset-password?recovery=1&next=/en/account');
  await expect(page.getByRole('heading', {name: 'Choose a new password'})).toBeVisible();
  await expect(page.getByLabel('Password', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue('/en/account');
});
