'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {reissueDigitalEntitlement, revokeDigitalEntitlement, type EntitlementActionResult} from '@/fulfillment/entitlements';
import {recordOperationalFailure} from '@/operations/errors';

const actionInputSchema = z.object({
  entitlementId: z.string().trim().min(1),
  expectedVersion: z.coerce.number().int().min(0),
  orderId: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(240).optional()
});

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

function sanitizeReason(value: string | undefined) {
  return value?.replace(/[^a-zA-Z0-9 .,;:_-]/g, '').trim().slice(0, 180) || undefined;
}

async function getAdminRpcClient() {
  const {requireAdmin} = await import('@/auth/guards');
  await requireAdmin();
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return createSupabaseAdminClient() as unknown as {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };
}

function parsedAction(formData: FormData) {
  return actionInputSchema.safeParse({
    entitlementId: getFormString(formData, 'entitlementId'),
    expectedVersion: getFormString(formData, 'expectedVersion'),
    orderId: getFormString(formData, 'orderId'),
    reason: sanitizeReason(getFormString(formData, 'reason'))
  });
}

function revalidateAdminOrder(orderId: string) {
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function revokeDigitalEntitlementAction(formData: FormData): Promise<EntitlementActionResult> {
  const parsed = parsedAction(formData);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }

  const client = await getAdminRpcClient();
  const result = await revokeDigitalEntitlement(parsed.data, client, recordOperationalFailure);
  revalidateAdminOrder(parsed.data.orderId);
  return result;
}

export async function reissueDigitalEntitlementAction(formData: FormData): Promise<EntitlementActionResult> {
  const parsed = parsedAction(formData);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }

  const client = await getAdminRpcClient();
  const result = await reissueDigitalEntitlement(parsed.data, client, undefined, recordOperationalFailure);
  revalidateAdminOrder(parsed.data.orderId);
  return result;
}
