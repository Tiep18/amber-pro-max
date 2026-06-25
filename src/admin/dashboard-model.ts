export type AdminDashboardCounts = {
  pendingPayments: number;
  failedEmails: number;
  pendingReviews: number;
  activeSubscribers: number;
  draftBlogPosts: number;
  scheduledBlogPosts: number;
  unresolvedOperations: number;
  launchBlockers: number;
};

export type AdminDashboardItem = {
  id: string;
  label: string;
  description: string;
  count: number;
  href: string;
};

export function buildAdminDashboardItems(counts: AdminDashboardCounts): AdminDashboardItem[] {
  return [
    {
      id: 'orders',
      label: 'Payment orders',
      description: 'Pending or review-required PayPal and VietQR payment work.',
      count: counts.pendingPayments,
      href: '/admin/orders'
    },
    {
      id: 'failed-emails',
      label: 'Failed transactional email',
      description: 'Email recovery items that may affect fulfillment or customer updates.',
      count: counts.failedEmails,
      href: '/admin/orders'
    },
    {
      id: 'reviews',
      label: 'Pending reviews',
      description: 'Customer reviews waiting for moderation.',
      count: counts.pendingReviews,
      href: '/admin/reviews?status=pending'
    },
    {
      id: 'newsletter',
      label: 'Active subscribers',
      description: 'Current newsletter audience for launch communications.',
      count: counts.activeSubscribers,
      href: '/admin/newsletter?status=subscribed'
    },
    {
      id: 'blog',
      label: 'Draft blog posts',
      description: 'Draft content that can be finished or scheduled before launch.',
      count: counts.draftBlogPosts,
      href: '/admin/blog'
    },
    {
      id: 'scheduled-blog',
      label: 'Scheduled blog posts',
      description: 'Published posts with future visibility owned by public query timing.',
      count: counts.scheduledBlogPosts,
      href: '/admin/blog'
    },
    {
      id: 'operations',
      label: 'Unresolved operations',
      description: 'Sanitized operational errors needing review.',
      count: counts.unresolvedOperations,
      href: '/admin/operations?status=unresolved&area=all'
    },
    {
      id: 'launch',
      label: 'Launch blockers',
      description: 'Fail-closed readiness gates still blocking launch.',
      count: counts.launchBlockers,
      href: '/admin/launch'
    }
  ];
}
