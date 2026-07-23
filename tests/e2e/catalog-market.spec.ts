import {
  catalogPath,
  expect,
  expectMarketCookie,
  MARKET_COOKIE,
  test,
  type StorefrontLocale,
  type StorefrontMarket
} from './fixtures/storefront-market';

test('market fixture isolates valid/invalid cookies, geo headers, and missing geo input', async ({
  storefrontMarket
}) => {
  const valid = await storefrontMarket.createSession({
    marketCookie: 'vn',
    geoCountry: 'US'
  });
  const invalid = await storefrontMarket.createSession({
    marketCookie: 'forged-market',
    geoCountry: 'VN'
  });
  const missingGeo = await storefrontMarket.createSession();

  expect((await valid.context.cookies()).find(({ name }) => name === MARKET_COOKIE)?.value).toBe(
    'vn'
  );
  expect((await invalid.context.cookies()).find(({ name }) => name === MARKET_COOKIE)?.value).toBe(
    'forged-market'
  );
  expect((await missingGeo.context.cookies()).some(({ name }) => name === MARKET_COOKIE)).toBe(
    false
  );

  for (const [session, expectedGeo] of [
    [valid, 'US'],
    [invalid, 'VN'],
    [missingGeo, null]
  ] as const) {
    let observedGeo: string | undefined;
    await session.page.route('**/fixture-probe', async (route) => {
      observedGeo = route.request().headers()['x-vercel-ip-country'];
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<main>fixture</main>' });
    });
    await session.page.goto('/fixture-probe');
    expect(observedGeo ?? null).toBe(expectedGeo);
  }
});

const combinations = [
  { locale: 'vi', market: 'vn', currency: /₫|VND/ },
  { locale: 'vi', market: 'intl', currency: /\$|USD/ },
  { locale: 'en', market: 'vn', currency: /₫|VND/ },
  { locale: 'en', market: 'intl', currency: /\$|USD/ }
] satisfies Array<{ locale: StorefrontLocale; market: StorefrontMarket; currency: RegExp }>;

for (const combination of combinations) {
  test(`catalog projects ${combination.locale}+${combination.market} with matching currency`, async ({
    storefrontMarket
  }) => {
    test.fixme(
      true,
      'Plan 09-13: promote after independent controls and active-market catalog projection converge'
    );
    const session = await storefrontMarket.createSession(combination);

    await session.page.goto(catalogPath(combination.locale));

    await expect(session.page.locator('html')).toHaveAttribute('lang', combination.locale);
    await expectMarketCookie(session.context, combination.market);
    const cards = session.page.getByRole('article');
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) {
      await expect(card).toContainText(combination.currency);
    }
  });
}

test('desktop exposes independent semantic language and shopping-region groups', async ({
  storefrontMarket
}) => {
  test.fixme(true, 'Plan 09-13: replace the legacy combined locale-market control');
  const session = await storefrontMarket.createSession({ locale: 'en', marketCookie: 'vn' });
  await session.page.goto('/en');

  const header = session.page.getByRole('banner');
  await header.getByRole('button', { name: /EN.*VN/i }).click();
  await expect(session.page.getByRole('group', { name: 'Language' })).toBeVisible();
  await expect(session.page.getByRole('group', { name: 'Shopping region' })).toBeVisible();
  await expect(session.page.getByRole('menuitemradio', { name: /Vietnam.*VND/i })).toBeChecked();
  await expect(
    session.page.getByRole('menuitemradio', { name: /International.*USD/i })
  ).not.toBeChecked();
});

test('mobile exposes independent 44px language and shopping-region choices', async ({
  storefrontMarket
}) => {
  test.fixme(true, 'Plan 09-13: replace the legacy combined mobile control');
  const session = await storefrontMarket.createSession({ locale: 'vi', marketCookie: 'intl' });
  await session.page.setViewportSize({ width: 320, height: 720 });
  await session.page.goto('/vi');

  await session.page
    .getByRole('banner')
    .getByRole('button', { name: /VI.*INTL/i })
    .click();
  const language = session.page.getByRole('group', { name: /Ngôn ngữ/i });
  const market = session.page.getByRole('group', { name: /Khu vực mua sắm/i });
  await expect(language).toBeVisible();
  await expect(market).toBeVisible();
  for (const option of await language.getByRole('radio').all()) {
    expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  for (const option of await market.getByRole('radio').all()) {
    expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});
