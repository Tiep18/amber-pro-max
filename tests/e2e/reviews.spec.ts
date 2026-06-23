import {expect, type Page, test} from '@playwright/test';
import {cleanupPhase6Data, seedPhase6Data, type Phase6Seed} from './fixtures/phase-6-seed';
import {signIn} from './fixtures/authenticated-users';

test.describe.configure({mode: 'serial'});

let seed: Phase6Seed;

function adminReviewSection(page: Page, title: string) {
  return page.getByRole('region', {name: `${title} for ${seed.products.review.title}`});
}

test.beforeAll(async () => {
  seed = await seedPhase6Data();
});

test.afterAll(async () => {
  await cleanupPhase6Data();
});

test.describe('verified product reviews (REV-01, D-09, D-10, D-11)', () => {
  test.beforeEach(async ({page}) => {
    await signIn(page, seed.customer, `/en/product/${seed.products.review.enSlug}`);
  });

  test('eligible customer can submit a verified product review', async ({page}) => {
    await page.goto(`/en/product/${seed.products.review.enSlug}`);
    await page.getByRole('group', {name: /rating/i}).getByText('5').click();
    await page.getByLabel(/review title/i).fill('Sweet bear');
    await page.getByLabel(/review body/i).fill('Beautifully made.');
    await page.getByRole('button', {name: /submit review/i}).click();
    await expect(page.getByRole('status')).toContainText(/pending moderation/i);
  });

  test('editing a review returns it to pending moderation', async ({page}) => {
    await page.goto(`/en/product/${seed.products.review.enSlug}`);
    await page.getByRole('group', {name: /rating/i}).getByText('4').click();
    await page.getByLabel(/review body/i).fill('Updated after using it.');
    await page.getByRole('button', {name: /submit review/i}).click();
    await expect(page.getByRole('status')).toContainText(/pending moderation/i);
  });

  test('public product page shows approved masked verified reviews only', async ({page}) => {
    await page.goto(`/en/product/${seed.products.review.enSlug}`);
    await expect(page.getByText('Verified purchase', {exact: true}).first()).toBeVisible();
    await expect(page.getByText(seed.customer.email)).toHaveCount(0);
    await expect(page.getByText(/pending moderation/i)).toHaveCount(0);
  });
});

test.describe('admin review moderation and shop reply (REV-02, D-12)', () => {
  test.beforeEach(async ({page}) => {
    await signIn(page, seed.admin, '/admin/reviews');
  });

  test('admin review queue filters pending and approved reviews', async ({page}) => {
    await page.goto('/admin/reviews?status=pending');
    await expect(page.getByRole('heading', {name: /review moderation/i, level: 1})).toBeVisible();
    await expect(adminReviewSection(page, 'Pending moderation fixture').first()).toBeVisible();
    await page.goto('/admin/reviews?status=approved');
    await expect(adminReviewSection(page, 'Approved fixture review').first()).toBeVisible();
  });

  test('admin approves and hides with stale-state-safe controls', async ({page}) => {
    await page.goto('/admin/reviews?status=pending');
    const pendingFixture = adminReviewSection(page, 'Pending moderation fixture').first();
    await pendingFixture.getByRole('button', {name: /approve review/i}).click();
    await expect(adminReviewSection(page, 'Pending moderation fixture')).toHaveCount(0);
    await page.goto('/admin/reviews?status=approved');
    await expect(adminReviewSection(page, 'Pending moderation fixture').first()).toBeVisible();
    page.once('dialog', async (dialog) => dialog.accept());
    const approvedFixture = adminReviewSection(page, 'Pending moderation fixture').first();
    await approvedFixture.getByRole('button', {name: /hide review/i}).click();
    await expect(adminReviewSection(page, 'Pending moderation fixture')).toHaveCount(0);
    await page.goto('/admin/reviews?status=hidden');
    await expect(adminReviewSection(page, 'Pending moderation fixture').first()).toBeVisible();
  });

  test('admin creates, edits, and removes one shop reply', async ({page}) => {
    await page.goto('/admin/reviews?status=approved');
    const replyFixture = adminReviewSection(page, 'Reply workflow fixture').first();
    await replyFixture.getByLabel(/shop reply/i).fill('Temporary reply for workflow coverage.');
    await replyFixture.getByRole('button', {name: /save reply/i}).click();
    await expect(replyFixture.getByRole('status')).toContainText(/reply saved/i);
    page.once('dialog', async (dialog) => dialog.accept());
    await replyFixture.getByRole('button', {name: /remove reply/i}).click();
    await expect(replyFixture.getByRole('status')).toContainText(/reply removed|state changed/i);
  });

  test('approved product review shows one public shop reply and hidden content disappears', async ({page}) => {
    await page.goto(`/en/product/${seed.products.review.enSlug}`);
    await expect(page.getByText(/shop reply/i)).toBeVisible();
    await expect(page.getByText('Thank you for your review.')).toHaveCount(1);
    await expect(page.getByText(/hidden moderation fixture/i)).toHaveCount(0);
  });
});
