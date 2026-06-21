import {expect, test} from '@playwright/test';

test.describe.skip('admin newsletter subscribers (NEWS-03, D-15, D-16)', () => {
  test('protects the subscriber inspection page', async ({page}) => {
    await page.goto('/admin/newsletter');
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin%2Fnewsletter/);
  });

  test('renders dense read-only subscriber rows with filters', async ({page}) => {
    await page.goto('/admin/newsletter?status=subscribed&locale=en&market=intl&search=reader');
    await expect(page.getByRole('heading', {name: /newsletter subscribers/i})).toBeVisible();
    await expect(page.getByLabel('Search email')).toHaveValue('reader');
    await expect(page.getByRole('cell', {name: 'reader@example.test'})).toBeVisible();
  });

  test('does not expose consent override controls or raw metadata', async ({page}) => {
    await page.goto('/admin/newsletter');
    await expect(page.getByRole('button', {name: /subscribe|unsubscribe/i})).toHaveCount(0);
    await expect(page.getByText(/token_hash|raw token|raw ip|user_agent_hash|[a-f0-9]{64}/i)).toHaveCount(0);
  });
});
