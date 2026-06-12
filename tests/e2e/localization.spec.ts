import {expect, test} from '@playwright/test';

test('first unprefixed visit with Vietnamese preference redirects to /vi', async ({browser}) => {
  const context = await browser.newContext({locale: 'vi-VN'});
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.getByText('Vietnamese')).toBeVisible();
  await context.close();
});

test('first unprefixed visit with English preference redirects to /en', async ({browser}) => {
  const context = await browser.newContext({locale: 'en-US'});
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText('English', {exact: true})).toBeVisible();
  await context.close();
});

test('explicit locale routes render without unprefixed customer content', async ({page}) => {
  await page.setViewportSize({width: 320, height: 720});
  await page.goto('/vi');
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.getByRole('heading', {name: 'Mau moc va qua tang len thu cong'})).toBeVisible();
  await expect(page.getByRole('banner').getByRole('navigation', {name: 'Language'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Mo menu'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({width: 1024, height: 720});
  await page.goto('/en');
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole('heading', {name: 'Handmade crochet patterns and keepsakes'})
  ).toBeVisible();
  await expect(page.getByRole('link', {name: 'Home'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Sign in'})).toBeVisible();
  await expect(page.getByText(/cart|catalog|blog|wishlist|order|payment|download|shipping/i)).toHaveCount(0);
});

test('language switching preserves equivalent translated auth page', async ({page}) => {
  await page.goto('/vi/dang-nhap');
  await expect(page.getByRole('heading', {name: 'Dang nhap'})).toBeVisible();

  await page.getByRole('banner').getByRole('link', {name: 'English'}).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
  await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();

  await page.getByRole('banner').getByRole('link', {name: 'Tieng Viet'}).click();
  await expect(page).toHaveURL(/\/vi\/dang-nhap$/);
});
