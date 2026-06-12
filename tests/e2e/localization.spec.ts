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
  await expect(page.getByText('English')).toBeVisible();
  await context.close();
});

test('explicit locale routes render without unprefixed customer content', async ({page}) => {
  await page.goto('/vi');
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.getByRole('heading', {name: 'Mau moc va qua tang len thu cong'})).toBeVisible();

  await page.goto('/en');
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole('heading', {name: 'Handmade crochet patterns and keepsakes'})
  ).toBeVisible();
});

test('language switching preserves equivalent translated auth page', async ({page}) => {
  await page.goto('/vi/dang-nhap');
  await expect(page.getByRole('heading', {name: 'Dang nhap'})).toBeVisible();

  await page.getByRole('link', {name: 'English'}).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
  await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();

  await page.getByRole('link', {name: 'Vietnamese'}).click();
  await expect(page).toHaveURL(/\/vi\/dang-nhap$/);
});
