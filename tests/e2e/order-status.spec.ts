import {expect, test} from '@playwright/test';

const seededPaymentFixturesPending =
  'Skipped until Plan 04-10 provides seeded payment orders plus guest/customer authorization helpers for executable browser runs.';

test.describe('Phase 4 customer order status contract', () => {
  test.skip('authorized guest opens order status with order number, immutable lines, totals, deadline, and locked fulfillment', async ({
    page
  }) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/en/orders/ATB-20260615-0001');
    await expect(page.getByRole('heading', {name: /Awaiting payment|Verifying payment|Payment confirmed/})).toBeVisible();
    await expect(page.getByText(/Fulfillment is locked|eligible for the next fulfillment step/i)).toBeVisible();
  });

  test.skip('signed-in owner can view only their own order payment status and summary', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/en/orders/ATB-20260615-0001');
    await expect(page.getByText(/Order ATB-20260615-0001/)).toBeVisible();
    await expect(page.getByText(/service_role|access_token|provider payload|webhook/i)).toHaveCount(0);
  });

  test.skip('PayPal return before verified webhook shows verifying state and never paid', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/en/orders/ATB-20260615-0001?paypal_return=1');
    await expect(page.getByRole('heading', {name: 'Verifying payment'})).toBeVisible();
    await expect(page.getByText('Payment confirmed')).toHaveCount(0);
  });

  test.skip('Vietnamese VietQR awaiting order shows exact VND amount, immutable reference, QR image, deadline, and no customer self-confirm button', async ({
    page
  }) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/vi/don-hang/ATB-20260615-0002');
    await expect(page).toHaveURL(/\/vi\/don-hang\/ATB-20260615-0002/);
    await expect(page.getByText(/VietQR|Chuyen khoan dung so tien|Transfer the exact amount/i)).toBeVisible();
    await expect(page.getByText(/VND|₫|So tien chinh xac/i)).toBeVisible();
    await expect(page.getByText(/Noi dung chuyen khoan|ATB-20260615-0002/i)).toBeVisible();
    await expect(page.getByText(/Han thanh toan|Han giu hang/i)).toBeVisible();
    await expect(page.getByRole('button', {name: /Toi da thanh toan|I have paid/i})).toHaveCount(0);
    await expect(page.getByText(/Quyen nhan hang dang khoa|Fulfillment is locked/i)).toBeVisible();
  });

  test.skip('English VietQR awaiting order keeps amount, reference, deadline, and copy controls localized', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/en/orders/ATB-20260615-0002');
    await expect(page).toHaveURL(/\/en\/orders\/ATB-20260615-0002/);
    await expect(page.getByText('Transfer the exact amount and reference')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Copy amount'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Copy reference'})).toBeVisible();
    await expect(page.getByText(/Payment deadline|Reservation deadline/i)).toBeVisible();
  });

  test.skip('unauthorized guest or mismatched customer receives a generic non-enumerating denial', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.goto('/en/orders/ATB-DOES-NOT-LEAK');
    await expect(page.getByRole('heading', {name: 'This order cannot be opened'})).toBeVisible();
    await expect(page.getByText(/ATB-DOES-NOT-LEAK|PayPal|VietQR|\$|VND/i)).toHaveCount(0);
  });

  test.skip('mobile 375px VietQR order detail keeps status, amount, reference, deadline, and lock visible without horizontal scroll', async ({
    page
  }) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/vi/don-hang/ATB-20260615-0002');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/So tien chinh xac|Noi dung chuyen khoan|Han thanh toan/i)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test.skip('desktop 1280px VietQR order detail keeps a scannable two-column payment and summary layout', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en/orders/ATB-20260615-0002');
    await expect(page.getByText('Transfer the exact amount and reference')).toBeVisible();
    await expect(page.getByText('Order summary')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test.skip('VietQR verifying, rejected, expired, and paid states keep text-and-icon status with the paid gate closed until server-paid', async ({
    page
  }) => {
    test.info().annotations.push({type: 'skip-reason', description: seededPaymentFixturesPending});
    for (const path of [
      '/en/orders/ATB-20260615-VIETQR-VERIFYING',
      '/en/orders/ATB-20260615-VIETQR-REJECTED',
      '/en/orders/ATB-20260615-VIETQR-EXPIRED',
      '/en/orders/ATB-20260615-VIETQR-PAID'
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', {name: /Verifying payment|Bank transfer rejected|Payment window expired|Payment confirmed/})).toBeVisible();
      await expect(page.locator('svg[aria-hidden="true"]').first()).toBeVisible();
    }
    await expect(page.getByText(/PDF access and shipping work begin only after|eligible for the next fulfillment step/i)).toBeVisible();
  });
});
