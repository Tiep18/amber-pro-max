import {expect, test} from '@playwright/test';

test.describe.skip('localized newsletter subscribe (NEWS-01, NEWS-02, D-13, D-16)', () => {
  test('English footer explicitly subscribes without requiring an account', async ({page}) => {
    await page.goto('/en');
    await page.getByLabel('Email').last().fill('newsletter-en@example.test');
    await page.getByRole('button', {name: 'Subscribe to newsletter'}).click();
    await expect(page.getByRole('status')).toContainText("You're subscribed");
    await expect(page).toHaveURL(/\/en/);
  });

  test('Vietnamese footer explicitly subscribes with localized consent copy', async ({page}) => {
    await page.goto('/vi');
    await page.getByLabel('Email').last().fill('newsletter-vi@example.test');
    await page.getByRole('button', {name: 'Dang ky nhan ban tin'}).click();
    await expect(page.getByRole('status')).toContainText('Ban da dang ky');
  });
});

test.describe.skip('one-click newsletter unsubscribe (NEWS-02, D-14, D-16)', () => {
  test('English confirmation email link opens an unauthenticated unsubscribe result', async ({page}) => {
    await page.goto('/en/newsletter/unsubscribe?token=phase-6-valid-token');
    await expect(page.getByRole('heading', {name: /unsubscribed/i})).toBeVisible();
    await expect(page.getByRole('link', {name: /subscribe again/i})).toBeVisible();
  });

  test('Vietnamese unsubscribe result is localized and does not render token material', async ({page}) => {
    await page.goto('/vi/ban-tin/huy-dang-ky?token=phase-6-expired-token');
    await expect(page.getByRole('heading', {name: /huy dang ky|lien ket/i})).toBeVisible();
    await expect(page.getByText('phase-6-expired-token')).toHaveCount(0);
  });

  test('subscribe confirmation uses the locale-matched one-click link shape', async ({page}) => {
    await page.goto('/en');
    await expect(page.getByRole('button', {name: 'Subscribe to newsletter'})).toBeVisible();
    await page.goto('/en/newsletter/unsubscribe?token=phase-6-invalid-token');
    await expect(page).toHaveURL(/\/en\/newsletter\/unsubscribe\?token=/);
  });
});
