import {expect, test} from '@playwright/test';

test.describe('account purchases', () => {
  test.skip('signed-in customer sees only their own order history', async ({page}) => {
    await page.goto('/en/account/orders');
    await expect(page.getByRole('heading', {name: /order history/i})).toBeVisible();
  });

  test.skip('signed-in customer can open grouped PDF pattern library without storage details', async ({page}) => {
    await page.goto('/en/account/patterns');
    await expect(page.getByRole('heading', {name: /pattern library/i})).toBeVisible();
    await expect(page.getByText(/pattern-pdfs|object_path|signed_url|token_hash/i)).toHaveCount(0);
  });

  test.skip('Vietnamese account purchase routes render localized library copy', async ({page}) => {
    await page.goto('/vi/tai-khoan/mau-pdf');
    await expect(page.getByText(/thu vien mau pdf/i)).toBeVisible();
  });
});
