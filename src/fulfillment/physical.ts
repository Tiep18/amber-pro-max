import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';
import {
  physicalFulfillmentStatusSchema,
  type PhysicalFulfillmentStatus
} from '@/fulfillment/schemas';

const updateInputSchema = z.object({
  orderId: z.uuid(),
  expectedStatus: physicalFulfillmentStatusSchema,
  expectedVersion: z.coerce.number().int().min(0),
  status: physicalFulfillmentStatusSchema,
  carrier: z.string().trim().max(120).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  trackingUrl: z.string().trim().max(500).optional(),
  note: z.string().trim().max(240).optional()
});

export type PhysicalFulfillmentInput = z.input<typeof updateInputSchema>;
export type PhysicalFulfillmentResult =
  | {status: 'updated'; physicalStatus: PhysicalFulfillmentStatus; version: number}
  | {status: 'stale'; code: 'physical_state_changed'}
  | {
      status: 'invalid';
      code: 'invalid_physical_transition' | 'invalid_tracking_url' | 'invalid_physical_request';
    }
  | {status: 'not_found'; code: 'physical_fulfillment_not_found'}
  | {status: 'error'; code: 'physical_update_failed'};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{data: unknown; error: unknown}>;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function recordPhysicalFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {orderId: string; fulfillmentStatus: PhysicalFulfillmentStatus}
) {
  if (!recorder) return;

  await runMonitoredAction({
    area: 'fulfillment',
    action: 'update',
    errorCode: 'physical_update_failed',
    summary: 'Atomic physical fulfillment update failed',
    errorResult: {status: 'error', code: 'physical_update_failed'},
    shouldRecordResult: () => true,
    facts: {
      orderId: input.orderId,
      fulfillmentStatus: input.fulfillmentStatus
    },
    recordOperationalFailure: recorder,
    operation: async () => ({status: 'error', code: 'physical_update_failed'})
  });
}

export function buildPhysicalFulfillmentUpdate(input: {
  status: PhysicalFulfillmentStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
}) {
  const trackingUrl = clean(input.trackingUrl);
  if (trackingUrl && !trackingUrl.startsWith('https://')) {
    return {status: 'invalid' as const, code: 'invalid_tracking_url' as const};
  }
  return {
    status: 'valid' as const,
    update: {
      status: input.status,
      carrier: clean(input.carrier),
      tracking_number: clean(input.trackingNumber),
      tracking_url: trackingUrl,
      admin_note: clean(input.note)
    }
  };
}

function mapRpcResult(data: unknown): PhysicalFulfillmentResult {
  if (!isRecord(data) || typeof data.status !== 'string') {
    return {status: 'error', code: 'physical_update_failed'};
  }

  if (data.status === 'updated') {
    const physicalStatus = physicalFulfillmentStatusSchema.safeParse(data.physicalStatus);
    if (
      physicalStatus.success &&
      typeof data.version === 'number' &&
      Number.isInteger(data.version) &&
      data.version > 0
    ) {
      return {status: 'updated', physicalStatus: physicalStatus.data, version: data.version};
    }
    return {status: 'error', code: 'physical_update_failed'};
  }
  if (data.status === 'stale') {
    return {status: 'stale', code: 'physical_state_changed'};
  }
  if (data.status === 'not_found') {
    return {status: 'not_found', code: 'physical_fulfillment_not_found'};
  }
  if (
    data.status === 'invalid' &&
    (data.code === 'invalid_physical_transition' ||
      data.code === 'invalid_tracking_url' ||
      data.code === 'invalid_physical_request')
  ) {
    return {status: 'invalid', code: data.code};
  }
  return {status: 'error', code: 'physical_update_failed'};
}

export async function updatePhysicalFulfillment(
  input: PhysicalFulfillmentInput,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<PhysicalFulfillmentResult> {
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_physical_request'};
  }

  const built = buildPhysicalFulfillmentUpdate(parsed.data);
  if (built.status === 'invalid') return built;

  const {data, error} = await client.rpc('update_physical_fulfillment', {
    p_payload: {
      orderId: parsed.data.orderId,
      expectedStatus: parsed.data.expectedStatus,
      expectedVersion: parsed.data.expectedVersion,
      status: built.update.status,
      carrier: built.update.carrier,
      trackingNumber: built.update.tracking_number,
      trackingUrl: built.update.tracking_url,
      note: built.update.admin_note
    }
  });
  const result = error ? {status: 'error' as const, code: 'physical_update_failed' as const} : mapRpcResult(data);

  if (result.status === 'error') {
    await recordPhysicalFailure(recordOperationalFailure, {
      orderId: parsed.data.orderId,
      fulfillmentStatus: parsed.data.status
    });
  }
  return result;
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function updatePhysicalFulfillmentAction(
  formData: FormData
): Promise<PhysicalFulfillmentResult> {
  'use server';

  const {requireAdmin} = await import('@/auth/guards');
  await requireAdmin();
  const {createSupabaseServerClient} = await import('@/lib/supabase/server');
  const {recordOperationalFailure} = await import('@/operations/errors');
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
