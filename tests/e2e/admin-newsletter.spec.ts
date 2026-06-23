import {expect, test} from '@playwright/test';
import {cleanupPhase6Data, seedPhase6Data, type Phase6Seed} from './fixtures/phase-6-seed';
import {signIn} from './fixtures/authenticated-users';

test.describe.configure({mode: 'serial'});

let seed: Phase6Seed;

test.beforeAll(async () => {
  seed = await seedPhase6Data();
});

test.afterAll(async () => {
  await cleanupPhase6Data();
});

test.describe('admin newsletter subscribers (NEWS-03, D-15, D-16)', () => {
  test('protects the subscriber inspection page', async ({page}) => {
    await page.goto('/admin/newsletter');
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fadmin%2Fnewsletter/);
  });

  test('renders dense read-only subscriber rows with filters', async ({page}) => {
    await signIn(page, seed.admin, '/admin/newsletter');
    await page.goto(`/admin/newsletter?status=subscribed&locale=en&market=intl&search=${encodeURIComponent(seed.newsletterReaderEmail.slice(0, 8))}`);
    await expect(page.getByRole('heading', {name: /newsletter subscribers/i})).toBeVisible();
    await expect(page.getByLabel('Search email')).toHaveValue(seed.newsletterReaderEmail.slice(0, 8));
    await expect(page.getByRole('cell', {name: seed.newsletterReaderEmail})).toBeVisible();
  });

  test('does not expose consent override controls or raw metadata', async ({page}) => {
    await signIn(page, seed.admin, '/admin/newsletter');
    await page.goto('/admin/newsletter');
    await expect(page.getByRole('button', {name: /subscribe|unsubscribe/i})).toHaveCount(0);
    await expect(page.getByText(/token_hash|raw token|raw ip|user_agent_hash|[a-f0-9]{64}/i)).toHaveCount(0);
  });
});
