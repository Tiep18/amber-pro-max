import { expect, test } from '@playwright/test';
import { rest } from './fixtures/authenticated-users';

const VARIANT_PRODUCT_ID = '50000000-0000-0000-0000-000000000003';

async function setVariantFixtureStatus(status: 'draft' | 'published') {
  await rest(`products?id=eq.${VARIANT_PRODUCT_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null
    })
  });
}

test.beforeAll(async () => {
  await setVariantFixtureStatus('published');
});

test.afterAll(async () => {
  await setVariantFixtureStatus('draft');
});

function storedCart(lines: unknown[]) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return JSON.stringify({
    version: 1,
    updatedAt: now,
    expiresAt,
    lines
  });
}

test('Vietnamese cart accessibility quantity controls and Undo stay item specific', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'x-vercel-ip-country': 'VN' } });
  const page = await context.newPage();

  await page.goto('/vi/san-pham/mau-gau-vn');
  await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await expect(page.getByRole('button', { name: /Giỏ hàng, 1 sản phẩm/ })).toBeVisible();

  // Adding opens the mini cart, which routes on to the localized checkout
  // instead of exposing a separate "view cart" link.
  const miniCart = page.getByRole('dialog', { name: 'Giỏ hàng' });
  await expect(miniCart.getByText('Mau gau Viet Nam')).toBeVisible();
  await expect(miniCart.getByRole('link', { name: 'Tiến hành thanh toán' })).toHaveAttribute(
    'href',
    '/vi/thanh-toan'
  );
  await page.goto('/vi/gio-hang');
  await expect(page).toHaveURL(/\/vi\/gio-hang$/);
  const pdfLine = page.getByRole('article').filter({ hasText: 'Mau gau Viet Nam' });
  await expect(pdfLine.getByTestId('cart-line-thumbnail')).toBeVisible();
  await expect(pdfLine.getByRole('heading', { name: 'Mau gau Viet Nam' })).toBeVisible();
  await expect(pdfLine.getByText('Mẫu PDF')).toBeVisible();

  const increaseQuantity = page.getByRole('button', { name: /Tăng số lượng Mau gau Viet Nam/ });
  const removeLine = page.getByRole('button', { name: /Xóa Mau gau Viet Nam/ });
  for (const control of [increaseQuantity, removeLine]) {
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await increaseQuantity.click();
  await expect(pdfLine.getByText('250.000')).toBeVisible();

  await removeLine.click();
  await expect(page.getByText('Đã xóa khỏi giỏ hàng')).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByRole('heading', { name: 'Mau gau Viet Nam' })).toBeVisible();
  await expect(page.getByText(/PayPal|VietQR/i)).toHaveCount(0);

  await context.close();
});

test('PDP sticky accessibility and mini-cart undo share durable cart feedback', async ({
  page
}) => {
  test.slow();
  await page.goto('/en/product/both-market-bear');
  await expect(page.getByRole('heading', { name: 'Both-market bear' })).toBeVisible({
    timeout: 30_000
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const stickyAction = page.getByRole('button', { name: 'Add to cart' }).last();
  await expect(stickyAction).toBeVisible();
  await expect(stickyAction).toBeDisabled();
  await expect(stickyAction).toHaveAttribute('aria-describedby', /add-to-cart/);
  const describedBy = await stickyAction.getAttribute('aria-describedby');
  const stickyReason = page.locator(`#${describedBy}`);
  await expect(stickyReason).toBeVisible();
  expect((await stickyReason.textContent())?.trim().length).toBeGreaterThan(20);
  const stickyBox = await stickyAction.boundingBox();
  expect(stickyBox?.width).toBeGreaterThanOrEqual(44);
  expect(stickyBox?.height).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('radio', { name: /small/i }).check({ timeout: 15_000 });
  await expect(page.locator('[aria-hidden="true"] button:not([disabled])')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add to cart' }).click();

  const cartDialog = page.getByRole('dialog', { name: 'Cart' });
  await expect(cartDialog).toBeVisible();
  await expect(cartDialog.getByText('Handmade item', { exact: true })).toBeVisible();
  await expect(cartDialog.getByRole('heading', { name: 'Both-market bear' })).toBeVisible();
  await expect(cartDialog.getByTestId('mini-cart-thumbnail')).toBeVisible();
  await expect(cartDialog.getByText('$31.00').first()).toBeVisible();
  await page.getByRole('button', { name: /Increase quantity/ }).click();
  await expect(cartDialog.getByText('$62.00').first()).toBeVisible();
  await cartDialog.getByRole('button', { name: /Remove Both-market bear/ }).click();
  await expect(cartDialog.getByText('Removed from cart.')).toBeVisible();
  await cartDialog.getByRole('button', { name: 'Undo' }).click();
  await expect(cartDialog.getByRole('heading', { name: 'Both-market bear' })).toBeVisible();
});

test('blocked cart checkout links complete blockers and labels the products subtotal', async ({
  page
}) => {
  const now = new Date().toISOString();
  const blockedLines = [
    {
      productId: '50000000-0000-0000-0000-000000000001',
      variantId: null,
      quantity: 1,
      marketAtAdd: 'vn',
      addedAt: now,
      updatedAt: now
    }
  ];
  await page.addInitScript(
    ({ cart }) => {
      localStorage.setItem('amigurumi.guestCart.v1', cart);
    },
    {
      cart: storedCart(blockedLines)
    }
  );

  await page.goto('/en/cart');
  const blockedLine = page.getByRole('article');
  await expect(blockedLine.getByRole('heading', { name: 'Unavailable item' })).toBeVisible();
  await expect(blockedLine.getByText('Unavailable for the current quote')).toBeVisible();
  await expect(page.getByTestId('cart-line-thumbnail')).toBeVisible();
  await expect(page.getByText('Products subtotal')).toBeVisible();
  await expect(
    page.getByText('Shipping is calculated at checkout. This is not the final total.')
  ).toBeVisible();
  await expect(page.getByText('Current total')).toHaveCount(0);

  const checkout = page.getByRole('button', { name: 'Checkout' });
  await expect(checkout).toBeDisabled();
  await expect(checkout).toHaveAttribute('aria-describedby', 'cart-checkout-blocker');
  await expect(page.locator('#cart-checkout-blocker')).toContainText('1');
  await expect(page.locator('#cart-checkout-blocker')).toContainText('Unavailable item');

  await page.getByRole('button', { name: /Cart, 1 item/ }).click();
  const miniCart = page.getByRole('dialog', { name: 'Cart' });
  const miniCheckout = miniCart.getByRole('button', { name: 'Checkout' });
  await expect(miniCheckout).toBeDisabled();
  await expect(miniCheckout).toHaveAttribute(
    'aria-describedby',
    'mini-cart-checkout-blocker'
  );
  await expect(miniCart.locator('#mini-cart-checkout-blocker')).toContainText(
    'Unavailable item'
  );
  await expect(page.getByText(/PayPal|VietQR/i)).toHaveCount(0);
});
