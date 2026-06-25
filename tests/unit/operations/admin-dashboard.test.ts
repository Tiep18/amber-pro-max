import {describe, expect, it} from 'vitest';
import {buildAdminDashboardItems, type AdminDashboardCounts} from '@/admin/dashboard-model';

const counts: AdminDashboardCounts = {
  pendingPayments: 2,
  failedEmails: 1,
  pendingReviews: 3,
  activeSubscribers: 4,
  draftBlogPosts: 5,
  scheduledBlogPosts: 6,
  unresolvedOperations: 7,
  launchBlockers: 8
};

describe('admin dashboard (ADM-01, D-09, D-10, D-12)', () => {
  it('keeps operational areas separate and actionable', () => {
    const items = buildAdminDashboardItems(counts);

    expect(items.map((item) => item.id)).toEqual([
      'orders',
      'failed-emails',
      'reviews',
      'newsletter',
      'blog',
      'scheduled-blog',
      'operations',
      'launch'
    ]);
    expect(items.map((item) => item.href)).toEqual([
      '/admin/orders',
      '/admin/orders',
      '/admin/reviews?status=pending',
      '/admin/newsletter?status=subscribed',
      '/admin/blog',
      '/admin/blog',
      '/admin/operations?status=unresolved&area=all',
      '/admin/launch'
    ]);
  });

  it('surfaces launch blockers without exposing evidence values', () => {
    const items = buildAdminDashboardItems(counts);
    const serialized = JSON.stringify(items);

    expect(items.find((item) => item.id === 'launch')?.count).toBe(8);
    expect(serialized).not.toMatch(/paypalSandboxEvidence|vietqrBankEvidence|sellerPolicyApproval/i);
  });
});
