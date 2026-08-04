import {expect, test} from '@playwright/test';

import {signIn} from './fixtures/authenticated-users';
import {
  cleanupPhase10Commerce,
  seedPhase10Commerce,
  type Phase10CommerceSeed
} from './fixtures/phase-10-commerce-seed';

let seed: Phase10CommerceSeed;

const copy = {
  paid: 'Payment confirmed',
  verifying: 'Verifying payment',
  awaiting: 'Awaiting payment',
  downloads: 'Pattern downloads',
  tracking: 'Shipment tracking'
} as const;

test.beforeAll(async () => {
  seed = await seedPhase10Commerce();
});

test.afterAll(async () => {
  await cleanupPhase10Commerce();
});

test.describe('customer order status contract', () => {
  test('signed-in owner sees immutable lines and sanitized provider presentation', async ({page}) => {
    const fixture = seed.orders['paid-mixed'];
    await signIn(page, seed.customer, `/en/orders/${fixture.orderNumber}`);
    await expect(page.getByRole('heading', {name: copy.paid})).toBeVisible();
    await expect(page.getByText(seed.products.digital.title)).toBeVisible();
    await expect(page.getByText(seed.products.physical.title)).toBeVisible();
    await expect(page.getByText(/service_role|access_token|provider payload|webhook|client_secret/i)).toHaveCount(0);
  });

  test('PayPal return query cannot turn a verifying order into paid', async ({page}) => {
    const fixture = seed.orders.verifying;
    await signIn(page, seed.customer, `/en/orders/${fixture.orderNumber}`);
    await page.goto(`/en/orders/${fixture.orderNumber}?paypal_return=1`);
    await expect(page.getByRole('heading', {name: copy.verifying})).toBeVisible();
    await expect(page.getByRole('heading', {name: copy.paid})).toHaveCount(0);
  });

  test('paid digital, physical, and mixed orders expose only relevant private next steps', async ({page}) => {
    await signIn(page, seed.customer, `/en/orders/${seed.orders['paid-digital'].orderNumber}`);
    await expect(page.getByRole('heading', {name: copy.downloads})).toBeVisible();
    await expect(page.getByRole('heading', {name: copy.tracking})).toHaveCount(0);

    await page.goto(`/en/orders/${seed.orders['paid-physical'].orderNumber}`);
    await expect(page.getByRole('heading', {name: copy.tracking})).toBeVisible();
    await expect(page.getByRole('heading', {name: copy.downloads})).toHaveCount(0);

    await page.goto(`/en/orders/${seed.orders['paid-mixed'].orderNumber}`);
    await expect(page.getByRole('heading', {name: copy.downloads})).toBeVisible();
    await expect(page.getByRole('heading', {name: copy.tracking})).toBeVisible();
  });

  test('mobile and desktop order layouts do not overflow or expose hidden duplicate controls', async ({page}) => {
    const fixture = seed.orders['pending-vietqr'];
    await signIn(page, seed.customer, `/en/orders/${fixture.orderNumber}`);
    for (const viewport of [
      {width: 375, height: 812},
      {width: 1440, height: 900}
    ]) {
      await page.setViewportSize(viewport);
      await page.reload();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole('heading', {name: copy.awaiting})).toBeVisible();
      const tabbablePrimary = page.locator('a:visible, button:visible').filter({hasText: /Pay|Download|Restore|Browse/});
      expect(await tabbablePrimary.count()).toBeLessThanOrEqual(2);
    }
  });
});
