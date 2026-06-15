import {expect, test} from '@playwright/test';

test('exception request page is available without reserving inventory', async ({page}) => {
  await page.goto('/en/exception-request');

  await expect(page.getByRole('heading', {name: 'Request exception'})).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Product ID')).toBeVisible();
  await expect(page.getByLabel('Destination country')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Send request'})).toBeVisible();
  await expect(page.getByText('reserved')).toHaveCount(0);
});

test('approved exception link uses generic invalid state for bad tokens', async ({page}) => {
  await page.goto('/en/exception-request/approved?token=bad-token');

  await expect(page.getByRole('heading', {name: 'Approved exception'})).toBeVisible();
  await expect(page.getByText('invalid or expired')).toBeVisible();
});
