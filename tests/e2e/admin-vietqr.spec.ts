import {expect, test} from '@playwright/test';

const seededAdminVietQrHelpersPending =
  'Skipped until Plan 04-10 provides seeded VietQR evidence orders and authenticated admin browser helpers.';

test.describe('Phase 4 admin VietQR decision contract', () => {
  test.skip('admin confirm requires bank reference, received amount, received timestamp, and matching evidence', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await page.getByRole('textbox', {name: /Bank reference/i}).fill('BANKREF-TEST-0002');
    await page.getByRole('textbox', {name: /Received amount/i}).fill('250000');
    await page.getByLabel(/Received at/i).fill('2026-06-15T04:00');
    await expect(page.getByRole('button', {name: 'Confirm payment'})).toBeEnabled();
  });

  test.skip('wrong amount or reference cannot be confirmed and must use audited reject flow', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await page.getByRole('textbox', {name: /Received amount/i}).fill('249000');
    await expect(page.getByRole('button', {name: 'Confirm payment'})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Reject payment'})).toBeVisible();
  });

  test.skip('reject dialog states inventory release and same-order non-payable consequence', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await page.getByRole('button', {name: 'Reject payment'}).click();
    await expect(page.getByText(/inventory released|same order cannot retry/i)).toBeVisible();
  });

  test.skip('two admin confirmations or stale confirm-versus-reject produce one transition and one inventory outcome', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await expect(page.getByText(/duplicate|stale|Recorded without applying another payment or inventory transition/i)).toBeVisible();
  });

  test.skip('admin decision feedback is persistent inline state, not toast-only', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test.skip('admin VietQR detail shows expected customer amount, reference, deadline, evidence, and gate state before action', async ({
    page
  }) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await expect(page.getByText(/Expected amount|250000|VND/i)).toBeVisible();
    await expect(page.getByText(/Expected reference|ATB-20260615-0002/i)).toBeVisible();
    await expect(page.getByText(/Payment deadline|Reserved until/i)).toBeVisible();
    await expect(page.getByText(/Fulfillment is locked|Locked/i)).toBeVisible();
  });

  test.skip('admin VietQR mobile evidence panel avoids horizontal overflow before confirm or reject', async ({page}) => {
    test.info().annotations.push({type: 'skip-reason', description: seededAdminVietQrHelpersPending});
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/admin/orders/ATB-20260615-0002');
    await expect(page.getByText(/Confirm payment|Reject payment|Bank reference/i)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
