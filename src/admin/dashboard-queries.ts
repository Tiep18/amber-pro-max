import 'server-only';

import {requireAdmin as requireAdminGuard} from '@/auth/guards';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getAdminLaunchReadiness} from '@/launch/settings';
import {buildAdminDashboardItems, type AdminDashboardCounts, type AdminDashboardItem} from './dashboard-model';

export {buildAdminDashboardItems, type AdminDashboardCounts, type AdminDashboardItem} from './dashboard-model';

type RequireAdmin = () => Promise<unknown>;

export type AdminDashboardResult =
  | {status: 'success'; items: AdminDashboardItem[]; counts: AdminDashboardCounts}
  | {status: 'error'; code: 'admin_dashboard_load_failed'};

type CountFilter = {
  column: string;
  operator: 'eq' | 'in' | 'gt';
  value: string | string[] | boolean;
};

async function countRows(client: unknown, table: string, filters: CountFilter[] = []) {
  const query = (client as {from: (name: string) => unknown}).from(table) as {
    select: (columns: string, options: {count: 'exact'; head: true}) => unknown;
  };
  let builder = query.select('*', {count: 'exact', head: true}) as {
    count: number | null;
    error: unknown;
    eq: (column: string, value: string | boolean) => unknown;
    in: (column: string, value: string[]) => unknown;
    gt: (column: string, value: string) => unknown;
  };

  for (const filter of filters) {
    builder =
      filter.operator === 'eq'
        ? (builder.eq(filter.column, filter.value as string | boolean) as typeof builder)
        : filter.operator === 'in'
          ? (builder.in(filter.column, filter.value as string[]) as typeof builder)
          : (builder.gt(filter.column, filter.value as string) as typeof builder);
  }

  const {count, error} = (await builder) as {count: number | null; error: unknown};
  if (error) {
    throw new Error('admin_dashboard_count_failed');
  }
  return count ?? 0;
}

export async function getAdminDashboard({
  requireAdmin = requireAdminGuard
}: {
  requireAdmin?: RequireAdmin;
} = {}): Promise<AdminDashboardResult> {
  await requireAdmin();
  const client = createSupabaseAdminClient();

  try {
    const [pendingPayments, failedEmails, pendingReviews, activeSubscribers, draftBlogPosts, scheduledBlogPosts, unresolvedOperations, launch] =
      await Promise.all([
        countRows(client, 'payments', [{column: 'status', operator: 'in', value: ['pending', 'verifying', 'review_required']}]),
        countRows(client, 'transactional_email_outbox', [{column: 'status', operator: 'eq', value: 'failed'}]),
        countRows(client, 'product_reviews', [{column: 'status', operator: 'eq', value: 'pending'}]),
        countRows(client, 'newsletter_subscribers', [{column: 'status', operator: 'eq', value: 'subscribed'}]),
        countRows(client, 'blog_posts', [{column: 'status', operator: 'eq', value: 'draft'}]),
        countRows(client, 'blog_posts', [
          {column: 'status', operator: 'eq', value: 'published'},
          {column: 'published_at', operator: 'gt', value: new Date().toISOString()}
        ]),
        countRows(client, 'operational_errors', [{column: 'status', operator: 'eq', value: 'unresolved'}]),
        getAdminLaunchReadiness({requireAdmin: async () => true})
      ]);

    const counts: AdminDashboardCounts = {
      pendingPayments,
      failedEmails,
      pendingReviews,
      activeSubscribers,
      draftBlogPosts,
      scheduledBlogPosts,
      unresolvedOperations,
      launchBlockers: launch.status === 'success' ? launch.readiness.gates.filter((gate) => gate.status === 'blocked').length : 0
    };

    return {status: 'success', counts, items: buildAdminDashboardItems(counts)};
  } catch {
    return {status: 'error', code: 'admin_dashboard_load_failed'};
  }
}
