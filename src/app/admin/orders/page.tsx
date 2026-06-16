import {requireAdmin} from '@/auth/guards';
import {OrderQueue} from '@/components/admin/orders/order-queue';
import {createAdminOrderQueryClient, getAdminOrderQueue} from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const client = await createAdminOrderQueryClient();
  const result = await getAdminOrderQueue({client, requireAdmin: async () => true});

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin orders</p>
        <h1 className="text-3xl font-semibold">Orders and payments</h1>
      </div>
      {result.status === 'success' ? (
        <OrderQueue orders={result.orders} />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Admin order queue could not be loaded.
        </p>
      )}
    </main>
  );
}
