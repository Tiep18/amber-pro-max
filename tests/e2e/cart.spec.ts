import { expect, test } from '@playwright/test';

const now = '2026-06-15T00:00:00.000Z';
const expiresAt = '2026-07-15T00:00:00.000Z';

function storedCart(lines: unknown[]) {
  return JSON.stringify({
    version: 1,
    updatedAt: now,
    expiresAt,
    lines
  });
}

test('Vietnamese shopper adds a PDF pattern and edits it in the cart', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'x-vercel-ip-country': 'VN' } });
  const page = await context.newPage();

  await page.goto('/vi/san-pham/mau-gau-vn');
  await page.getByRole('button', { name: 'Them vao gio' }).click();
  await expect(page.getByRole('button', { name: /Gio hang, 1 san pham/ })).toBeVisible();

  await expect(
    page.getByRole('dialog', { name: 'Gio hang' }).getByRole('link', { name: 'Xem gio hang' })
  ).toHaveAttribute('href', '/vi/gio-hang');
  await page.goto('/vi/gio-hang');
  await expect(page).toHaveURL(/\/vi\/gio-hang$/);
  const pdfLine = page.getByRole('article').filter({ hasText: 'Mau gau Viet Nam' });
  await expect(pdfLine.getByRole('heading', { name: 'Mau gau Viet Nam' })).toBeVisible();
  await expect(pdfLine.getByText('Mau PDF')).toBeVisible();

  await page.getByRole('button', { name: /Tang so luong/ }).click();
  await expect(pdfLine.getByText('250.000')).toBeVisible();

  await page.getByRole('button', { name: /Xoa Mau gau Viet Nam/ }).click();
  await expect(page.getByText('Da xoa khoi gio hang')).toBeVisible();
  await page.getByRole('button', { name: 'Hoan tac' }).click();
  await expect(page.getByRole('heading', { name: 'Mau gau Viet Nam' })).toBeVisible();
  await expect(page.getByText(/PayPal|VietQR/i)).toHaveCount(0);

  await context.close();
});

test('English shopper adds an in-stock physical variant through the mini cart', async ({
  page
}) => {
  await page.goto('/en/product/both-market-bear');
  await page.getByRole('radio', { name: /small/i }).check();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByRole('dialog', { name: 'Cart' })).toBeVisible();
  await expect(page.getByText('Handmade item')).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Cart' }).getByRole('heading', { name: 'Both-market bear' })
  ).toBeVisible();
  const cartDialog = page.getByRole('dialog', { name: 'Cart' });
  await expect(cartDialog.getByText('$31.00').first()).toBeVisible();
  await page.getByRole('button', { name: /Increase quantity/ }).click();
  await expect(cartDialog.getByText('$62.00').first()).toBeVisible();
});

test('blocking cart lines remain visible and disable checkout', async ({ page }) => {
  await page.goto('/en');
  await page.evaluate(
    (payload) => {
      localStorage.setItem('amigurumi.guestCart.v1', payload);
    },
    storedCart([
      {
        productId: '50000000-0000-0000-0000-000000000001',
        variantId: null,
        quantity: 1,
        marketAtAdd: 'vn',
        addedAt: now,
        updatedAt: now
      }
    ])
  );

  await page.goto('/en/cart');
  await expect(page.getByRole('heading', { name: 'Unavailable item' })).toBeVisible();
  await expect(page.getByText('Review unavailable items before checkout.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  await expect(page.getByText(/PayPal|VietQR/i)).toHaveCount(0);
});
