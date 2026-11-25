'use server';

import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/auth/guards';
import type {PhysicalFulfillmentStatus} from '@/fulfillment/schemas';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';
import {updatePhysicalFulfillment, type PhysicalFulfillmentResult} from './physical';

type RpcClient = Parameters<typeof updatePhysicalFulfillment>[1];

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function updatePhysicalFulfillmentAction(
  formData: FormData
): Promise<PhysicalFulfillmentResult> {
  await requireAdmin();
  const orderNumber = formString(formData, 'orderNumber') ?? '';
  const result = await updatePhysicalFulfillment(
    {
      orderId: formString(formData, 'orderId') ?? '',
      expectedStatus: (formString(formData, 'expectedStatus') ?? '') as PhysicalFulfillmentStatus,
      expectedVersion: formString(formData, 'expectedVersion') ?? '',
      status: (formString(formData, 'status') ?? '') as PhysicalFulfillmentStatus,
      carrier: formString(formData, 'carrier'),
      trackingNumber: formString(formData, 'trackingNumber'),
      trackingUrl: formString(formData, 'trackingUrl'),
      note: formString(formData, 'note')
    },
    (await createSupabaseServerClient()) as unknown as RpcClient,
    recordOperationalFailure
  );
  revalidatePath('/admin/orders');
  if (orderNumber) revalidatePath(`/admin/orders/${encodeURIComponent(orderNumber)}`);
  return result;
}
