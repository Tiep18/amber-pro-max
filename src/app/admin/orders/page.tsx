import { requireAdmin } from '@/auth/guards';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { OrderQueue } from '@/components/admin/orders/order-queue';
import { createAdminOrderQueryClient, getAdminOrderQueue } from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const client = await createAdminOrderQueryClient();
  const result = await getAdminOrderQueue({ client, requireAdmin: async () => true });

  return (
    <main className="grid w-full gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin orders</p>
        <h1 className="text-[28px] font-semibold leading-tight sm:text-4xl">Orders and payments</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Review VietQR and PayPal payment states before fulfillment can move forward.
        </p>
      </div>
      {result.status === 'success' ? (
        <OrderQueue orders={result.orders} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Admin order queue could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">
            Refresh the page or inspect server logs with sensitive data redacted.
          </p>
        </Alert>
      )}
    </main>
  );
}
