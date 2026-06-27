import { notFound } from 'next/navigation';

import { requireAdmin } from '@/auth/guards';
import { AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { OrderDetail } from '@/components/admin/orders/order-detail';
import { createAdminOrderQueryClient, getAdminOrderDetailByOrderNumber } from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireAdmin();
  const { orderNumber } = await params;
  const client = await createAdminOrderQueryClient();
  const result = await getAdminOrderDetailByOrderNumber({
    orderNumber: decodeURIComponent(orderNumber),
    client,
    requireAdmin: async () => true
  });

  if (result.status === 'not_found') {
    notFound();
  }

  return (
    <AdminPageShell>
      {result.status === 'success' ? (
        <OrderDetail order={result.order} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Admin order detail could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">Refresh the page or return to the order queue.</p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
