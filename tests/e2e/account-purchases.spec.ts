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
  test.skip('guest can request a generic reopen email in English and Vietnamese', async ({page}) => {
    await page.goto('/en/guest-order');
    await expect(page.getByRole('heading', {name: /reopen guest order/i})).toBeVisible();
    await page.goto('/vi/don-hang-khach');
    await expect(page.getByRole('heading', {name: /mo lai don hang/i})).toBeVisible();
  });

  test.skip('same-email signed-in customer can claim an order with token proof', async ({page}) => {
    await page.goto('/en/orders/ATB-1/claim?token=claim-token');
    await expect(page.getByRole('heading', {name: /claim order/i})).toBeVisible();
    await expect(page.getByText(/invalid|expired|wrong email/i)).toHaveCount(0);
  });
});
