import { expect, test } from '@playwright/test';

test.describe('Ambertinybear homepage', () => {
  for (const locale of ['vi', 'en']) {
    test(`${locale} presents distinct handmade and pattern shopping paths`, async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole('heading', { level: 1, name: 'Ambertinybear' })).toBeVisible();
      await expect(page.getByTestId('shop-path-handmade')).toBeVisible();
      await expect(page.getByTestId('shop-path-patterns')).toBeVisible();
    });
  }

  test('en presents the approved content-led storefront promises', async ({ page }) => {
    await page.goto('/en');

    await expect(
      page.getByText('Bringing tiny characters to life, one stitch at a time')
    ).toBeVisible();
    await expect(page.getByTestId('hero-handmade-cta')).toContainText('Shop handmade friends');
    await expect(page.getByTestId('hero-patterns-cta')).toContainText('Browse PDF patterns');
    await expect(page.getByText('Guest checkout welcome')).toBeVisible();
    await expect(page.getByText('Private pattern downloads')).toBeVisible();
  });

  test('primary actions remain usable without mobile overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/vi');

    await expect(page.getByTestId('hero-handmade-cta')).toBeVisible();
    await expect(page.getByTestId('hero-patterns-cta')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  });

  test('handmade hero action reaches its shopping path', async ({ page }) => {
    await page.goto('/vi');
    await page.getByTestId('hero-handmade-cta').click();

    await expect(page).toHaveURL(/\/vi#shop-path-handmade$/);
    await expect(page.getByTestId('shop-path-handmade')).toBeInViewport();
  });
});
