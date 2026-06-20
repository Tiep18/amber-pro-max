import {expect, test} from '@playwright/test';

test.describe('order downloads', () => {
  test.skip('signed-in owner can request a fresh PDF link only after paid entitlement validation', async ({page}) => {
    await page.goto('/en/orders/ATB-PAID-DIGITAL');
    await expect(page.getByRole('button', {name: /download pattern/i})).toBeVisible();
  });

  test.skip('guest email link opens the app download route without exposing raw storage paths', async ({page}) => {
    await page.goto('/api/downloads?orderNumber=ATB-PAID-DIGITAL&token=fixture-token');
    await expect(page).not.toHaveURL(/pattern-pdfs|object_path|token_hash/i);
  });

  test.skip('expired or revoked download access shows recovery copy instead of a private PDF URL', async ({page}) => {
    await page.goto('/en/orders/ATB-EXPIRED-DOWNLOAD');
    await expect(page.getByText(/request a fresh link|lien ket moi/i)).toBeVisible();
  });
  test.skip('mixed order page shows digital and physical progress separately', async ({page}) => {
    await page.goto('/en/orders/ATB-MIXED-SHIPPED');
    await expect(page.getByText(/digital/i)).toBeVisible();
    await expect(page.getByText(/physical|shipment/i)).toBeVisible();
  });

  test.skip('customer sees shipped without tracking copy or safe https tracking link', async ({page}) => {
    await page.goto('/en/orders/ATB-SHIPPED-NO-TRACKING');
    await expect(page.getByText(/shipped without tracking|tracking will be updated/i)).toBeVisible();
  });
});
