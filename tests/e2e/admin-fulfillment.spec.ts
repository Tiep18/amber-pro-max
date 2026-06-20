import {expect, test} from '@playwright/test';

test.describe('admin fulfillment', () => {
  test.skip('admin can inspect failed email queue without seeing raw tokens or provider payloads', async ({page}) => {
    await page.goto('/admin/orders');
    await expect(page.getByText(/failed email|email queue/i)).toBeVisible();
    await expect(page.getByText(/raw_token|provider_payload|signed_url/i)).toHaveCount(0);
  });

  test.skip('admin can retry a failed transactional email through the protected worker flow', async ({page}) => {
    await page.goto('/admin/orders/ATB-EMAIL-FAILED');
    await expect(page.getByRole('button', {name: /retry email/i})).toBeVisible();
  });

  test.skip('admin can revoke active digital access with confirmation and audit context', async ({page}) => {
    await page.goto('/admin/orders/ATB-DIGITAL-ACTIVE');
    await expect(page.getByRole('button', {name: /revoke access/i})).toBeVisible();
    await expect(page.getByText(/digital entitlement audit/i)).toBeVisible();
  });

  test.skip('admin can reissue digital access without exposing raw token material', async ({page}) => {
    await page.goto('/admin/orders/ATB-DIGITAL-REVOKED');
    await expect(page.getByRole('button', {name: /reissue access/i})).toBeVisible();
    await expect(page.getByText(/raw_token|token_hash|signed_url|object_path/i)).toHaveCount(0);
  });
});
