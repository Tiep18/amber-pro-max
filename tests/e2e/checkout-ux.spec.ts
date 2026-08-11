import {expect, test, type Page} from '@playwright/test';

import {signIn} from './fixtures/authenticated-users';
import {
  cleanupPhase10Commerce,
  seedPhase10Commerce,
  type Phase10CommerceSeed
} from './fixtures/phase-10-commerce-seed';

const VIEWPORTS = [
  {width: 375, height: 812},
  {width: 390, height: 844},
  {width: 768, height: 1024},
  {width: 1024, height: 768},
  {width: 1440, height: 900}
] as const;

let seed: Phase10CommerceSeed;

test.beforeAll(async () => {
  seed = await seedPhase10Commerce();
});

test.afterAll(async () => {
  await cleanupPhase10Commerce();
});

async function setCart(page: Page, locale: 'en' | 'vi', market: 'intl' | 'vn' = 'intl') {
  await page.context().addCookies([
    {name: 'ACTIVE_MARKET', value: market, url: 'http://localhost:3210', sameSite: 'Lax'}
  ]);
  await page.goto(`/${locale}`);
  const now = new Date().toISOString();
  await page.evaluate(
    ({productId, activeMarket, timestamp}) => {
      localStorage.setItem(
        'amigurumi.guestCart.v1',
        JSON.stringify({
          version: 1,
          updatedAt: timestamp,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            {
              productId,
              variantId: null,
              quantity: 1,
              marketAtAdd: activeMarket,
              addedAt: timestamp,
              updatedAt: timestamp
            }
          ]
        })
      );
    },
    {productId: seed.products.physical.id, activeMarket: market, timestamp: now}
  );
}

for (const locale of ['en', 'vi'] as const) {
  for (const viewport of VIEWPORTS) {
    test(`${locale} checkout reflows at ${viewport.width}x${viewport.height}`, async ({page}) => {
      await page.setViewportSize(viewport);
      await setCart(page, locale);
      await page.goto(`/${locale}/checkout`);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      const primarySubmit = viewport.width < 1024
        ? page.getByTestId('checkout-submit-mobile')
        : page.getByTestId('checkout-submit');
      await expect(primarySubmit).toBeVisible();

      const showSummaryName =
        locale === 'vi' ? 'Xem tóm tắt đơn hàng' : 'Show order summary';
      const hideSummaryName =
        locale === 'vi' ? 'Ẩn tóm tắt đơn hàng' : 'Hide order summary';
      const initialMobileSummary = page.getByRole('button', {name: showSummaryName});
      if (viewport.width < 1024) {
        await expect(initialMobileSummary).toBeVisible();
      } else {
        await expect(initialMobileSummary).toHaveCount(0);
      }

      const beforeZoom = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(beforeZoom).toBe(true);
      await page.setViewportSize({
        width: Math.max(320, Math.floor(viewport.width / 2)),
        height: viewport.height
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const visibleControls = page.locator(
        'main button:visible, main a:visible, main input:not([type="checkbox"]):visible'
      );
      const count = Math.min(await visibleControls.count(), 24);
      const undersized: Array<{tag: string; name: string; width: number; height: number}> = [];
      for (let index = 0; index < count; index += 1) {
        const control = visibleControls.nth(index);
        const box = await control.boundingBox();
        if (box && Math.max(box.width, box.height) < 44) {
          undersized.push({
            tag: await control.evaluate((element) => element.tagName.toLowerCase()),
            name: (await control.getAttribute('aria-label')) ?? (await control.textContent()) ?? '',
            width: box.width,
            height: box.height
          });
        }
      }
      expect(undersized).toEqual([]);

      const reflowedMobileSummary = page.getByRole('button', {name: showSummaryName});
      await expect(reflowedMobileSummary).toBeVisible();
      await reflowedMobileSummary.click();
      await expect(page.getByRole('button', {name: hideSummaryName})).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });
  }
}

test('keyboard-only destination selection keeps normalized codes behind localized labels', async ({page}) => {
  test.setTimeout(60_000);
  await signIn(page, seed.customer, '/en/account');
  await setCart(page, 'en');
  await page.goto('/en/checkout');

  const country = page.getByRole('combobox', {name: 'Shipping country'});
  await country.focus();
  await page.keyboard.press('Enter');
  const countrySearch = page.getByRole('textbox', {name: 'Search shipping countries'});
  await countrySearch.fill('United States');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(country).toContainText('United States');

  const quoteReview = page.getByRole('dialog', {name: 'Shipping and total changed'});
  await expect(quoteReview).toBeVisible();
  await quoteReview.getByRole('button', {name: 'Use updated quote'}).click();

  const region = page.getByRole('combobox', {name: 'State or territory'});
  await expect(region).toBeEnabled({timeout: 20_000});
  await region.focus();
  await page.keyboard.press('Enter');
  const regionSearch = page.getByRole('textbox', {name: 'Search states and territories'});
  await expect(regionSearch).toBeVisible();
  await regionSearch.fill('California');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(region).toContainText(/California.*CA/);
  await expect(region).toHaveAttribute('aria-expanded', 'false');
});

test('field blur is isolated and the tab draft excludes authority, proof, and consent values', async ({page}) => {
  test.setTimeout(60_000);
  await setCart(page, 'en');
  await page.goto('/en/checkout');
  await expect(page.getByRole('heading', {name: 'Delivery address'})).toBeVisible();

  const country = page.getByRole('combobox', {name: 'Shipping country'});
  await country.click();
  await page.getByRole('textbox', {name: 'Search shipping countries'}).fill('United States');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const quoteReview = page.getByRole('dialog', {name: 'Shipping and total changed'});
  await expect(quoteReview).toBeVisible();
  await quoteReview.getByRole('button', {name: 'Use updated quote'}).click();

  const recipient = page.getByLabel('Recipient name');
  const phone = page.getByLabel('Phone number');
  await recipient.focus();
  await recipient.blur();
  await expect(recipient).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).not.toHaveAttribute('aria-invalid', 'true');

  const contactEmail = page
    .getByRole('region', {name: 'Contact email'})
    .getByRole('textbox');
  await contactEmail.fill('checkout.phase10@example.test');
  await recipient.fill('Taylor Customer');
  await phone.fill('+15551234567');
  await page.getByLabel('Street address').fill('123 Market Street');
  await page.getByLabel('ZIP or postal code').fill('94105');
  await page.waitForTimeout(100);

  const stored = await page.evaluate(() =>
    Object.entries(sessionStorage)
      .filter(([key]) => key.includes('checkout'))
      .map(([key, value]) => ({key, value, parsed: JSON.parse(value)}))
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.parsed).toMatchObject({
    email: 'checkout.phase10@example.test',
    shippingAddress: {
      recipientName: 'Taylor Customer',
      phoneNumber: '+15551234567',
      countryCode: 'US',
      addressLine1: '123 Market Street',
      postalCode: '94105'
    }
  });
  expect(JSON.stringify(stored[0]?.parsed)).not.toMatch(
    /guest|token|proof|quote|discount|payment|provider|idempotency|incident|saveAddress/i
  );

  await page.reload();
  const storedAfterReload = await page.evaluate((key) => sessionStorage.getItem(key), stored[0]!.key);
  expect(JSON.parse(storedAfterReload ?? 'null')).toMatchObject({
    email: 'checkout.phase10@example.test',
    shippingAddress: {recipientName: 'Taylor Customer'}
  });
  await expect(
    page.getByRole('region', {name: 'Contact email'}).getByRole('textbox')
  ).toHaveValue('checkout.phase10@example.test');
  await expect(page.getByLabel('Recipient name')).toHaveValue('Taylor Customer');
});

test('same-tab auth transitions never hydrate checkout PII from another identity', async ({page}) => {
  test.setTimeout(90_000);
  await signIn(page, seed.customer, '/en/account');
  await setCart(page, 'en');
  await page.goto('/en/checkout');
  const firstEmail = page.getByRole('region', {name: 'Contact email'}).getByRole('textbox');
  await firstEmail.fill('private-a@example.test');
  await page.waitForTimeout(100);

  await page.goto('/en/account');
  await page.getByRole('button', {name: 'Sign out'}).click();
  await expect(page).toHaveURL(/\/en$/);
  await signIn(page, seed.secondCustomer, '/en/checkout');
  await expect(
    page.getByRole('region', {name: 'Contact email'}).getByRole('textbox')
  ).toHaveValue(seed.secondCustomer.email);

  await page.goto('/en/account');
  await page.getByRole('button', {name: 'Sign out'}).click();
  await page.goto('/en/checkout');
  const guestEmail = page.getByRole('region', {name: 'Contact email'}).getByRole('textbox');
  await guestEmail.fill('private-guest@example.test');
  await page.waitForTimeout(100);

  await signIn(page, seed.customer, '/en/checkout');
  await expect(
    page.getByRole('region', {name: 'Contact email'}).getByRole('textbox')
  ).toHaveValue(seed.customer.email);
});

test('authenticated address saving is signed-in only and unchecked on every load', async ({page}) => {
  await signIn(page, seed.customer, '/en/account');
  await setCart(page, 'en');
  await page.goto('/en/checkout');
  const save = page.getByRole('checkbox', {name: 'Save this address to my account'});
  await expect(save).toBeVisible();
  await expect(save).not.toBeChecked();
  await save.check();
  await expect(save).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', {name: 'Save this address to my account'})).not.toBeChecked();
});
