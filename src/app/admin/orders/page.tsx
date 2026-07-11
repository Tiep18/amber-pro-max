import { requireAdmin } from '@/auth/guards';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { OrderQueue } from '@/components/admin/orders/order-queue';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { createAdminOrderQueryClient, getAdminOrderQueue } from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const client = await createAdminOrderQueryClient();
  const result = await getAdminOrderQueue({ client, requireAdmin: async () => true });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin orders"
        title="Orders and payments"
        description="Review VietQR and PayPal payment states before fulfillment moves forward."
      />
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
    </AdminPageShell>
  );
}
