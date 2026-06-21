import {expect, test} from '@playwright/test';

// Plan 06-10 activates these contracts with authenticated purchase fixtures.
test.describe.skip('verified product reviews (REV-01, D-09, D-10, D-11)', () => {
  test('eligible customer can submit a verified product review', async ({page}) => {
    await page.goto('/en/product/both-market-bear');
    await page.getByRole('group', {name: /rating/i}).getByRole('radio', {name: '5'}).check();
    await page.getByLabel(/review title/i).fill('Sweet bear');
    await page.getByLabel(/review body/i).fill('Beautifully made.');
    await page.getByRole('button', {name: /submit review/i}).click();
    await expect(page.getByRole('status')).toContainText(/pending moderation/i);
  });

  test('editing a review returns it to pending moderation', async ({page}) => {
    await page.goto('/en/product/both-market-bear');
    await page.getByRole('button', {name: /edit review/i}).click();
    await page.getByLabel(/review body/i).fill('Updated after using it.');
    await page.getByRole('button', {name: /update review/i}).click();
    await expect(page.getByRole('status')).toContainText(/pending moderation/i);
  });

  test('public product page shows approved masked verified reviews only', async ({page}) => {
    await page.goto('/en/product/both-market-bear');
    await expect(page.getByText(/verified purchase/i)).toBeVisible();
    await expect(page.getByText(/taylor.customer@example.com/i)).toHaveCount(0);
    await expect(page.getByText(/pending moderation/i)).toHaveCount(0);
  });
});
