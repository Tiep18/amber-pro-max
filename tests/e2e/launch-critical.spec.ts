import {expect, test} from '@playwright/test';

test('OPS-04 D-08 launch smoke keeps localized storefront and checkout reachable on mobile', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});

  await page.goto('/en');
  await expect(page.getByRole('heading', {name: 'Handmade crochet patterns and keepsakes'})).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/vi');
  await expect(page.getByRole('heading', {name: 'Mau moc va qua tang len thu cong'})).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const checkout = await page.goto('/en/checkout');
  expect(checkout?.status()).toBeLessThan(500);
  await expect(page.getByRole('heading', {name: 'Checkout'})).toBeVisible();
});

test('ADM-01 OPS-03 OPS-04 D-11 private launch surfaces and provider routes fail closed', async ({page, request}) => {
  await page.goto('/admin/launch');
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin%2Flaunch/);

  await page.goto('/en/orders/ATB-DOES-NOT-LEAK');
  await expect(page.getByRole('heading', {name: 'This order cannot be opened'})).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/token|signature|secret|stack|raw_payload/i);

  const response = await request.post('/api/paypal/orders', {data: {}});
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({status: 'invalid', code: 'invalid_paypal_order_request'});
});
