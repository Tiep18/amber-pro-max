import {expect, test} from '@playwright/test';

test.describe('Phase 4 admin orders contract', () => {
  test.skip('admin order queue lists payment status, method, market, total, reservation, and URL-backed filters', async ({page}) => {
    await page.goto('/admin/orders?status=verifying&method=paypal&market=intl');
    await expect(page.getByRole('heading', {name: 'Orders and payments'})).toBeVisible();
    await expect(page.getByRole('link', {name: /View order/i}).first()).toBeVisible();
  });

  test.skip('admin order detail separates order, payment, digital, physical, gate, reservation, and customer facts', async ({page}) => {
    await page.goto('/admin/orders/ATB-20260615-0001');
    await expect(page.getByRole('heading', {name: /Order ATB-20260615-0001/i})).toBeVisible();
    await expect(page.getByText(/Payment state|Digital fulfillment|Physical fulfillment|Paid gate|Reservation/i)).toBeVisible();
  });

  test.skip('admin timeline shows redacted provider facts, duplicates, actor, source, timestamp, and inventory outcome', async ({page}) => {
    await page.goto('/admin/orders/ATB-20260615-0001');
    await expect(page.getByRole('list', {name: /Payment timeline|Audit timeline/i})).toBeVisible();
    await expect(page.getByText(/Recorded without applying another payment or inventory transition/i)).toBeVisible();
    await expect(page.getByText(/PAYPAL_CLIENT_SECRET|SUPABASE_SERVICE_ROLE_KEY|guest token/i)).toHaveCount(0);
  });

  test.skip('non-admin is denied before privileged order controls render', async ({page}) => {
    await page.goto('/admin/orders');
    await expect(page.getByRole('button', {name: /Confirm payment|Reject payment/i})).toHaveCount(0);
  });

  test.skip('admin queue has a responsive card layout below desktop width without horizontal scroll', async ({page}) => {
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/admin/orders');
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
