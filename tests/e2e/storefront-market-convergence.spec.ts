import {
  catalogPath,
  checkoutRegressionMatrix,
  expect,
  expectMarketCookie,
  expectPrivateNoStore,
  test
} from './fixtures/storefront-market';

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
  test.fixme(
    true,
    'Plan 09-13: promote after controls coordinate context and projection generations'
  );
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' });
  await storefrontMarket.interceptCatalog(session.page, [
    { delayMs: 250, body: { market: 'intl', user: null, contextVersion: 5 } },
    { delayMs: 10, body: { market: 'vn', user: null, contextVersion: 6 } }
  ]);
  await session.page.goto(catalogPath('en'));

  const trigger = session.page.getByTestId('commerce-context-trigger');
  await expect(trigger).toHaveAccessibleName(/EN.*VN/i);
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /International.*USD/i }).click();
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();

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
    .getByRole('link', { name: 'Cua hang', exact: true });
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
  test.fixme(true, 'Plan 09-12: promote after latest-wins CartProvider synchronization ships');
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  await session.page.goto('/en/cart');

  const trigger = session.page.getByRole('banner').getByRole('button', { name: /EN.*INTL/i });
  await trigger.click();
  await session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i }).click();

  const cart = session.page.getByRole('main');
  await expect(cart).toHaveAttribute('aria-busy', 'true');
  await expect(cart).not.toContainText(/\$|USD|free/i);
  await expect(cart.getByRole('button', { name: /checkout/i })).toBeDisabled();
  await expect(cart.getByRole('article')).not.toHaveCount(0);
});

test('destination quote remains authoritative after browsing-market invalidation', async ({
  storefrontMarket
}) => {
  test.fixme(true, 'Plan 09-12: promote without changing the Phase 08 destination quote lifecycle');
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'intl' });
  await session.page.goto('/en/checkout');
  await session.page.getByLabel(/country/i).selectOption('US');
  await session.page.getByLabel(/state|region/i).selectOption('CA');
  await storefrontMarket.signalInvalidation(session.page, 8);

  await expect(
    session.page.getByRole('dialog', { name: /shipping and total changed/i })
  ).toBeVisible();
  await expect(session.page.getByRole('button', { name: /place order/i })).toBeDisabled();
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
