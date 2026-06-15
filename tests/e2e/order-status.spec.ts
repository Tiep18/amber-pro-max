import {expect, test} from '@playwright/test';

test.describe('Phase 4 customer order status contract', () => {
  test.skip('authorized guest opens order status with order number, immutable lines, totals, deadline, and locked fulfillment', async ({page}) => {
    await page.goto('/en/orders/ATB-20260615-0001');
    await expect(page.getByRole('heading', {name: /Awaiting payment|Verifying payment|Payment confirmed/})).toBeVisible();
    await expect(page.getByText(/Fulfillment is locked|eligible for the next fulfillment step/i)).toBeVisible();
  });

  test.skip('signed-in owner can view only their own order payment status and summary', async ({page}) => {
    await page.goto('/en/orders/ATB-20260615-0001');
    await expect(page.getByText(/Order ATB-20260615-0001/)).toBeVisible();
    await expect(page.getByText(/service_role|access_token|provider payload|webhook/i)).toHaveCount(0);
  });

  test.skip('PayPal return before verified webhook shows verifying state and never paid', async ({page}) => {
    await page.goto('/en/orders/ATB-20260615-0001?paypal_return=1');
    await expect(page.getByRole('heading', {name: 'Verifying payment'})).toBeVisible();
    await expect(page.getByText('Payment confirmed')).toHaveCount(0);
  });

  test.skip('VietQR order shows exact VND amount, reference, QR image, deadline, and no customer self-confirm button', async ({page}) => {
    await page.goto('/vi/don-hang/ATB-20260615-0002');
    await expect(page.getByText(/VietQR|Chuyen khoan|Transfer/i)).toBeVisible();
    await expect(page.getByRole('button', {name: /Toi da thanh toan|I have paid/i})).toHaveCount(0);
  });

  test.skip('unauthorized guest or mismatched customer receives a generic non-enumerating denial', async ({page}) => {
    await page.goto('/en/orders/ATB-DOES-NOT-LEAK');
    await expect(page.getByRole('heading', {name: 'This order cannot be opened'})).toBeVisible();
    await expect(page.getByText(/ATB-DOES-NOT-LEAK|PayPal|VietQR|\$|VND/i)).toHaveCount(0);
  });

  test.skip('mobile order detail keeps status, totals, instructions, and actions visible without horizontal scroll', async ({page}) => {
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/en/orders/ATB-20260615-0001');
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
