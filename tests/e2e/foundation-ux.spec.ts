import {expect, test} from '@playwright/test';

const viewports = [
  {width: 320, height: 720},
  {width: 768, height: 900},
  {width: 1024, height: 900},
  {width: 1280, height: 900}
];

for (const viewport of viewports) {
  test(`localized public shells fit ${viewport.width}px viewport`, async ({page}) => {
    await page.setViewportSize(viewport);

    for (const path of ['/vi', '/en']) {
      await page.goto(path);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole('button', {name: /cart|gio hang/i})).toBeVisible();
    }
  });
}

test('auth form basics stay accessible on mobile', async ({page}) => {
  await page.setViewportSize({width: 320, height: 720});
  await page.goto('/vi/dang-nhap');

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mat khau')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('protected admin content does not flash for anonymous users', async ({page}) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin$/);
  await expect(page.getByText('Admin boundary')).toHaveCount(0);
  await expect(page.getByText(/project|token|service key|provider payload/i)).toHaveCount(0);
});
