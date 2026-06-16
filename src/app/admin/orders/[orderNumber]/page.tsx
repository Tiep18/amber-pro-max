import {notFound} from 'next/navigation';

import {requireAdmin} from '@/auth/guards';
import {OrderDetail} from '@/components/admin/orders/order-detail';
import {createAdminOrderQueryClient, getAdminOrderDetailByOrderNumber} from '@/payments/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({params}: {params: Promise<{orderNumber: string}>}) {
  await requireAdmin();
  const {orderNumber} = await params;
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
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
      {result.status === 'success' ? (
        <OrderDetail order={result.order} />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Admin order detail could not be loaded.
        </p>
      )}
    </main>
  );
}
