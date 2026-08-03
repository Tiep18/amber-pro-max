import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const MARKET_COOKIE = 'ACTIVE_MARKET';

async function addPreferenceCookie(context: BrowserContext, name: string, value: string) {
  await context.addCookies([{ name, value, url: 'http://localhost:3210' }]);
}

async function expectMarketCookie(context: BrowserContext, expected: 'vn' | 'intl') {
  const cookie = (await context.cookies()).find(({ name }) => name === MARKET_COOKIE);
  expect(cookie?.value).toBe(expected);
}

async function expectLocalizedHome(page: Page, locale: 'vi' | 'en') {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.getByRole('main')).toBeVisible();
}

test.describe('locale precedence', () => {
  test('direct /vi and /en entry wins without mutating the active market', async ({ browser }) => {
    for (const locale of ['vi', 'en'] as const) {
      const context = await browser.newContext({ locale: locale === 'vi' ? 'en-US' : 'vi-VN' });
      await addPreferenceCookie(context, 'NEXT_LOCALE', locale === 'vi' ? 'en' : 'vi');
      await addPreferenceCookie(context, MARKET_COOKIE, locale === 'vi' ? 'intl' : 'vn');
      const page = await context.newPage();

      await page.goto(`/${locale}`);

      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expectLocalizedHome(page, locale);
      await expectMarketCookie(context, locale === 'vi' ? 'intl' : 'vn');
      await context.close();
    }
  });

  test('valid NEXT_LOCALE wins over Accept-Language for unprefixed entry', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'vi-VN' });
    await addPreferenceCookie(context, 'NEXT_LOCALE', 'en');
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL(/\/en$/);
    await expectLocalizedHome(page, 'en');
    await context.close();
  });

  test('invalid locale cookie falls through to supported Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    await addPreferenceCookie(context, 'NEXT_LOCALE', 'fr');
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL(/\/en$/);
    await expectLocalizedHome(page, 'en');
    await context.close();
  });

  test('weighted Accept-Language chooses the highest-quality supported locale', async ({
    browser
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'vi;q=0.2,en-US;q=0.9' }
    });
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test('missing supported locale preference falls back to Vietnamese', async ({ browser }) => {
    const context = await browser.newContext();
    await context.route('**/*', async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), 'accept-language': 'fr-FR,fr;q=0.9' }
      });
    });
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL(/\/vi$/);
    await context.close();
  });
});

test('all four locale and market combinations remain independent', async ({ browser }) => {
  for (const locale of ['vi', 'en'] as const) {
    for (const market of ['vn', 'intl'] as const) {
      const context = await browser.newContext();
      await addPreferenceCookie(context, MARKET_COOKIE, market);
      const page = await context.newPage();

      await page.goto(`/${locale}`);

      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expectLocalizedHome(page, locale);
      await expectMarketCookie(context, market);
      await context.close();
    }
  }
});

test('localized auth entry renders while /auth/callback remains an isolated service route', async ({
  page
}) => {
  await page.goto('/vi/dang-nhap');
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

  await page.goto('/en/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  const callback = await page.request.get('/auth/callback?locale=en&next=/en/sign-in', {
    maxRedirects: 0
  });
  expect(callback.status()).toBe(307);
  expect(new URL(callback.headers().location).pathname).toBe('/en/sign-in');
});

test('language switching preserves market and only safe route query state', async ({ browser }) => {
  const context = await browser.newContext();
  await addPreferenceCookie(context, MARKET_COOKIE, 'vn');
  const page = await context.newPage();

  await page.goto('/en/catalog?search=bear&debug=1');
  await page.getByTestId('commerce-context-trigger').click();
  const languageLink = page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: 'Tiếng Việt (VI)' });
  await expect(languageLink).toBeVisible({ timeout: 5_000 });
  await expect(languageLink).toHaveAttribute('href', '/vi/cua-hang?search=bear');
  await languageLink.click();

  await expect(page).toHaveURL(/\/vi\/cua-hang\?search=bear$/);
  await expectMarketCookie(context, 'vn');
  await context.close();
});
