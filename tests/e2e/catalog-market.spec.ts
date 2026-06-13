import {expect, test} from '@playwright/test';

function activeMarketLabel(page: import('@playwright/test').Page) {
  return page.getByRole('banner').getByTestId('active-market-label');
}

test('suggestion sets VN for VN country and international for non-VN in separate contexts', async ({browser}) => {
  test.setTimeout(60_000);
  const vnContext = await browser.newContext({extraHTTPHeaders: {'x-vercel-ip-country': 'VN'}});
  const vnPage = await vnContext.newPage();
  await vnPage.goto('/en');
  await expect(activeMarketLabel(vnPage)).toHaveText('Vietnam');

  const intlContext = await browser.newContext({extraHTTPHeaders: {'x-vercel-ip-country': 'US'}});
  const intlPage = await intlContext.newPage();
  await intlPage.goto('/en');
  await expect(activeMarketLabel(intlPage)).toHaveText('International');

  await vnContext.close();
  await intlContext.close();
});

test('visible active market control appears in desktop and mobile header', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 720});
  await page.goto('/en');
  await expect(page.getByRole('banner').getByRole('navigation', {name: 'Market'})).toBeVisible();
  await expect(activeMarketLabel(page)).toHaveText('International');

  await page.setViewportSize({width: 320, height: 720});
  await page.goto('/vi');
  const mobileMarket = page.getByRole('banner').getByRole('navigation', {name: 'Thi truong'});
  await expect(mobileMarket).toBeVisible();
  await expect(mobileMarket.getByText(/Viet Nam|Quoc te/)).toBeVisible();
});

test('switch persists through refresh and navigation', async ({page}) => {
  await page.goto('/en');
  await expect(activeMarketLabel(page)).toHaveText('International');

  await page.getByRole('banner').getByRole('button', {name: 'Use Vietnam market'}).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(activeMarketLabel(page)).toHaveText('Vietnam');

  await page.reload();
  await expect(activeMarketLabel(page)).toHaveText('Vietnam');

  await page.getByRole('link', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
  await expect(activeMarketLabel(page)).toHaveText('Vietnam');
});

test('locale stays independent when market switches', async ({page}) => {
  await page.goto('/vi');
  await expect(activeMarketLabel(page)).toHaveText('Quoc te');

  await page.getByRole('banner').getByRole('button', {name: 'Dung thi truong Viet Nam'}).click();
  await expect(page).toHaveURL(/\/vi$/);
  await expect(activeMarketLabel(page)).toHaveText('Viet Nam');

  await page.getByRole('banner').getByRole('link', {name: 'English'}).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(activeMarketLabel(page)).toHaveText('Vietnam');
});

test('switch action ignores unsafe return path', async ({page}) => {
  await page.goto('/en');

  await page
    .getByRole('banner')
    .getByRole('button', {name: 'Use Vietnam market'})
    .evaluate((button) => {
      const form = button.closest('form');
      const input = form?.querySelector('input[name="returnTo"]');
      if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) {
        throw new Error('market form not found');
      }
      input.value = '//evil.example';
      input.setAttribute('value', '//evil.example');
      form.requestSubmit(button as HTMLButtonElement);
    });

  await expect(page).toHaveURL(/\/vi$/);
  expect(new URL(page.url()).origin).not.toBe('https://evil.example');
});
