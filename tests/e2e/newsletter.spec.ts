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
