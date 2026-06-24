import {expect, test} from '@playwright/test';
import {cleanupPhase6Data, seedPhase6Data, type Phase6Seed} from './fixtures/phase-6-seed';

test.describe.configure({mode: 'serial'});

let seed: Phase6Seed;

test.beforeAll(async () => {
  seed = await seedPhase6Data();
});

test.afterAll(async () => {
  await cleanupPhase6Data();
});

test.describe('localized newsletter subscribe (NEWS-01, NEWS-02, D-13, D-16)', () => {
  test('English footer explicitly subscribes without requiring an account', async ({page}) => {
    await page.goto('/en');
    await page.locator('#newsletter input[name="email"]').fill(`newsletter-en-${Date.now()}@example.test`);
    await page.getByRole('button', {name: 'Subscribe to newsletter'}).click();
    await expect(page.getByRole('status')).toContainText("You're subscribed");
    await expect(page).toHaveURL(/\/en/);
  });

  test('Vietnamese footer explicitly subscribes with localized consent copy', async ({page}) => {
    await page.goto('/vi');
    await page.locator('#newsletter input[name="email"]').fill(`newsletter-vi-${Date.now()}@example.test`);
    await page.getByRole('button', {name: 'Dang ky nhan ban tin'}).click();
    await expect(page.getByRole('status')).toContainText('Ban da dang ky');
  });
});

test.describe('one-click newsletter unsubscribe (NEWS-02, D-14, D-16)', () => {
  test('English confirmation email link opens an unauthenticated unsubscribe result', async ({page}) => {
    await page.goto(`/en/newsletter/unsubscribe?token=${seed.unsubscribeTokens.valid}`);
    await expect(page.getByRole('heading', {name: /unsubscribed/i})).toBeVisible();
    await expect(page.getByRole('link', {name: /subscribe again/i})).toBeVisible();
  });

  test('Vietnamese unsubscribe result is localized and does not render token material', async ({page}) => {
    await page.goto(`/vi/ban-tin/huy-dang-ky?token=${seed.unsubscribeTokens.expired}`);
    await expect(page.getByRole('heading', {name: /huy dang ky|lien ket/i})).toBeVisible();
    await expect(page.getByText(seed.unsubscribeTokens.expired)).toHaveCount(0);
  });

  test('subscribe confirmation uses the locale-matched one-click link shape', async ({page}) => {
    await page.goto('/en');
    await expect(page.getByRole('button', {name: 'Subscribe to newsletter'})).toBeVisible();
    await page.goto(`/en/newsletter/unsubscribe?token=${seed.unsubscribeTokens.invalid}`);
    await expect(page).toHaveURL(/\/en\/newsletter\/unsubscribe\?token=/);
  });
});
