import {
  catalogPath,
  checkoutRegressionMatrix,
  expect,
  expectMarketCookie,
  expectPrivateNoStore,
  test
} from './fixtures/storefront-market';
import { rest } from './fixtures/authenticated-users';

const createdProductIds: string[] = [];
const createdProfileIds: string[] = [];

function storedCart(productId: string, marketAtAdd: 'vn' | 'intl') {
  const now = new Date().toISOString();
  return JSON.stringify({
    version: 1,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lines: [
      {
        productId,
        variantId: null,
        quantity: 1,
        marketAtAdd,
        addedAt: now,
        updatedAt: now
      }
    ]
  });
}

async function createPublishedPhysicalProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const productResponse = await rest('products', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ product_type: 'physical_finished', status: 'draft' })
  });
  const [{ id }] = (await productResponse.json()) as Array<{ id: string }>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'vi',
        title: 'Gấu hội tụ thị trường',
        description: 'Gấu kiểm thử hội tụ thị trường.',
        specifications: { material: 'cotton' },
        slug: `gau-hoi-tu-${suffix}`,
        seo_title: 'Gấu hội tụ thị trường',
        seo_description: 'Gau handmade.'
      },
      {
        product_id: id,
        locale: 'en',
        title: 'Market convergence bear',
        description: 'Physical fixture for destination authority.',
        specifications: { material: 'cotton' },
        slug: `market-convergence-bear-${suffix}`,
        seo_title: 'Market convergence bear',
        seo_description: 'Physical checkout fixture.'
      }
    ])
  });
  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        market_code: 'vn',
        currency_code: 'VND',
        enabled: true,
        price_minor: 250000
      },
      {
        product_id: id,
        market_code: 'intl',
        currency_code: 'USD',
        enabled: true,
        price_minor: 1800
      }
    ])
  });
  await rest('inventory_records', {
    method: 'POST',
    body: JSON.stringify({ product_id: id, quantity_on_hand: 3 })
  });

  const profileResponse = await rest('shipping_profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: `Convergence shipping ${suffix}` })
  });
  const [{ id: profileId }] = (await profileResponse.json()) as Array<{ id: string }>;
  createdProfileIds.push(profileId);
  await rest('shipping_rules', {
    method: 'POST',
    body: JSON.stringify([
      {
        profile_id: profileId,
        country_code: 'US',
        currency_code: 'USD',
        first_item_fee_minor: 750,
        additional_item_fee_minor: 225
      },
      {
        profile_id: profileId,
        country_code: 'VN',
        currency_code: 'VND',
        first_item_fee_minor: 30000,
        additional_item_fee_minor: 10000
      }
    ])
  });
  await rest('product_shipping_profiles', {
    method: 'POST',
    body: JSON.stringify({ product_id: id, profile_id: profileId })
  });
  await rest(`products?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() })
  });

  return id;
}

test.afterEach(async () => {
  for (const productId of createdProductIds.splice(0)) {
    await rest(`products?id=eq.${productId}`, { method: 'DELETE' });
  }
  for (const profileId of createdProfileIds.splice(0)) {
    await rest(`shipping_profiles?id=eq.${profileId}`, { method: 'DELETE' });
  }
});

test('controlled response fixture delays, fails, counts, and marks private responses no-store', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession();
  const tracker = await storefrontMarket.interceptContext(session.page, [
    { delayMs: 10, body: { market: 'vn', user: null, contextVersion: 1 } },
    { status: 503 }
  ]);

  const firstResponse = session.page.waitForResponse((response) =>
    response.url().endsWith('/api/storefront-context')
  );
  await session.page.goto('/api/storefront-context');
  await expectPrivateNoStore(await firstResponse);
  expect(tracker.count()).toBe(1);

  const secondResponse = await session.page.goto('/api/storefront-context');
  expect(secondResponse?.status()).toBe(503);
  expect(tracker.count()).toBe(2);
});

test('rapid VN to INTL to VN intent commits only the newest server context and cart quote', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' });
  await storefrontMarket.interceptContext(session.page, [
    { body: { market: 'vn', user: null, contextVersion: 4 } },
    { delayMs: 250, body: { market: 'intl', user: null, contextVersion: 5 } },
    { delayMs: 10, body: { market: 'vn', user: null, contextVersion: 6 } }
  ]);
  await session.page.goto('/en');

  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /International.*USD/i }).click();
  await expect(trigger).toHaveAttribute('data-state', 'closed');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: International/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();

  await expect(trigger).toHaveAttribute('data-state', 'closed');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
  await expectMarketCookie(session.context, 'vn');
  await expect(session.page.getByRole('main')).not.toContainText(/\$|USD/);
});

test('late context and catalog projection responses cannot replace the latest market result', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' });
  let catalogRequests = 0;
  let delayedInternationalResponses = 0;
  await session.page.route(/\/api\/storefront\/catalog(?:\?.*)?$/, async (route) => {
    catalogRequests += 1;
    const response = await route.fetch();
    if (catalogRequests === 2) {
      delayedInternationalResponses += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await route.fulfill({ response });
  });
  await session.page.goto(catalogPath('en'));

  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /International.*USD/i }).click();
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: International/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();

  await expect.poll(() => delayedInternationalResponses).toBeGreaterThan(0);
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
  await expect(session.page.getByRole('main')).toContainText(/₫|VND/);
  await expect(session.page.getByRole('main')).not.toContainText(/\$|USD/);
});

test('failed market action retains committed selection, intent rows, and retry recovery', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' });
  await storefrontMarket.failNextServerAction(session.page);
  await session.page.goto('/en/cart');

  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /International.*USD/i }).click();

  await expect(trigger).toHaveAttribute(
    'aria-label',
    /Language: English.*Shopping region: Vietnam/i
  );
  await expect(session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i })).toBeChecked();
  const marketMenu = session.page.getByRole('menu', {
    name: /Language: English.*Shopping region: Vietnam/i
  });
  await expect(marketMenu.getByRole('alert')).toContainText(/previous selection.*active/i);
  await expect(marketMenu.getByRole('button', { name: /try again/i })).toBeVisible();
  await expectMarketCookie(session.context, 'vn');
});

test('committed market survives reload and client navigation without locale drift', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'vi', marketCookie: 'intl' });
  await session.page.goto('/vi');
  await session.page.reload();
  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/Ngôn ngữ: Tiếng Việt.*Khu vực mua sắm: Quốc tế/i);
  const catalogLink = session.page
    .getByRole('banner')
    .getByRole('link', { name: 'Cửa hàng', exact: true });
  await Promise.all([session.page.waitForURL(/\/vi\/cua-hang$/), catalogLink.click()]);

  await expect(session.page).toHaveURL(/\/vi\/cua-hang$/);
  await expect(session.page.locator('html')).toHaveAttribute('lang', 'vi');
  await expectMarketCookie(session.context, 'intl');
  await expect(trigger).toHaveAccessibleName(/Ngôn ngữ: Tiếng Việt.*Khu vực mua sắm: Quốc tế/i);
});

test('focus and visible transitions refetch while hidden state cannot commit commerce', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  const tracker = await storefrontMarket.interceptContext(session.page, [
    { body: { market: 'intl', user: null, contextVersion: 4 } },
    { body: { market: 'vn', user: null, contextVersion: 5 } },
    { body: { market: 'vn', user: null, contextVersion: 6 } }
  ]);
  await session.page.goto('/en');
  await expect.poll(tracker.count).toBe(1);
  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: International/i);
  await session.page.evaluate(() => {
    const validatedAt = Date.now();
    Date.now = () => validatedAt + 5 * 60 * 1000 + 1;
  });
  await storefrontMarket.setVisibility(session.page, 'hidden');
  expect(tracker.count()).toBe(1);

  await storefrontMarket.setVisibility(session.page, 'visible');
  await expect.poll(tracker.count).toBe(2);
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);

  await session.page.evaluate(() => {
    const validatedAt = Date.now();
    Date.now = () => validatedAt + 5 * 60 * 1000 + 1;
  });
  await storefrontMarket.focus(session.page);
  await expect.poll(tracker.count).toBe(3);
  await expect(trigger).toHaveAccessibleName(/Language: English.*Shopping region: Vietnam/i);
});

test('another tab sends invalidation only and the receiving tab refetches server authority', async ({
  storefrontMarket
}) => {
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  const second = await storefrontMarket.secondPage(session);
  const tracker = await storefrontMarket.interceptContext(second, [
    { body: { market: 'intl', user: null, contextVersion: 4 } },
    { body: { market: 'intl', user: null, contextVersion: 9 } }
  ]);
  await Promise.all([session.page.goto('/en'), second.goto('/en')]);
  await expect.poll(tracker.count).toBe(1);
  await expect(second.getByTestId('commerce-context-trigger')).toHaveAccessibleName(
    /Language: English.*Shopping region: International/i
  );

  await storefrontMarket.signalForgedInvalidation(session.page, 9);

  await expect.poll(tracker.count).toBe(2);
  await expect(second.getByTestId('commerce-context-trigger')).toHaveAccessibleName(
    /Language: English.*Shopping region: International/i
  );
  await expect(second.getByRole('main')).not.toContainText('untrusted-browser-value');
});

test('market requote masks stale amounts and preserves blocked intent rows until retry', async ({
  storefrontMarket
}) => {
  const productId = await createPublishedPhysicalProduct();
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  await session.page.addInitScript(
    (cart) => {
      localStorage.setItem('amigurumi.guestCart.v1', cart);
    },
    storedCart(productId, 'intl')
  );
  await session.page.goto('/en/cart');
  const cart = session.page.getByRole('main');
  await expect(cart.getByRole('heading', { name: 'Market convergence bear' })).toBeVisible();
  await expect(cart).toContainText('$18.00');

  let serverActions = 0;
  let delayedRequoteSettled = false;
  await session.page.route('**/*', async (route) => {
    if (route.request().method() !== 'POST' || !route.request().headers()['next-action']) {
      await route.continue();
      return;
    }
    serverActions += 1;
    const actionSequence = serverActions;
    const response = await route.fetch();
    if (actionSequence === 2) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.fulfill({ response });
    if (actionSequence === 2) {
      delayedRequoteSettled = true;
    }
  });

  const trigger = session.page.getByTestId('commerce-context-trigger');
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();

  await expect(cart.locator('[aria-busy="true"]').first()).toBeVisible();
  await expect(cart).not.toContainText(/\$|USD|free/i);
  await expect(cart.getByRole('button', { name: /checkout/i })).toBeDisabled();
  await expect(cart.getByRole('article')).not.toHaveCount(0);
  await expect.poll(() => serverActions).toBeGreaterThanOrEqual(2);
  await expect.poll(() => delayedRequoteSettled).toBe(true);
});

test('destination quote remains authoritative after browsing-market invalidation', async ({
  storefrontMarket
}) => {
  const productId = await createPublishedPhysicalProduct();
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  await session.page.addInitScript(
    (cart) => {
      localStorage.setItem('amigurumi.guestCart.v1', cart);
    },
    storedCart(productId, 'intl')
  );
  await session.page.goto('/en/checkout');
  await expect(session.page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await session.page.getByRole('combobox', { name: 'Shipping country' }).click();
  await session.page.getByRole('option', { name: /\(US\)/ }).click();
  const review = session.page.getByRole('dialog', { name: /shipping and total changed/i });
  await expect(review).toBeVisible();
  await storefrontMarket.signalInvalidation(session.page, 8);

  await expect(review).toBeVisible();
  await expect(review).toContainText(/\$7\.50/);
});

test('final checkout gate owns the digital, physical, mixed, guest, account, and payment pairs', () => {
  expect(checkoutRegressionMatrix).toEqual([
    { cart: 'digital', account: 'guest', market: 'vn', payment: 'vietqr' },
    { cart: 'digital', account: 'signed-in', market: 'intl', payment: 'paypal' },
    { cart: 'physical', account: 'guest', market: 'vn', payment: 'vietqr' },
    { cart: 'physical', account: 'signed-in', market: 'intl', payment: 'paypal' },
    { cart: 'mixed', account: 'guest', market: 'vn', payment: 'vietqr' },
    { cart: 'mixed', account: 'signed-in', market: 'intl', payment: 'paypal' }
  ]);
});
