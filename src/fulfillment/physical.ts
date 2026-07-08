import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {physicalFulfillmentStatusSchema, type PhysicalFulfillmentStatus} from '@/fulfillment/schemas';

const updateInputSchema = z.object({
  orderId: z.uuid(),
  expectedStatus: physicalFulfillmentStatusSchema,
  expectedVersion: z.coerce.number().int().min(0),
  status: physicalFulfillmentStatusSchema,
  carrier: z.string().trim().max(120).optional(),
  trackingNumber: z.string().trim().max(160).optional(),
  trackingUrl: z.string().trim().max(500).optional(),
  note: z.string().trim().max(240).optional(),
  locale: z.enum(['en', 'vi']),
  orderNumber: z.string().trim().min(1).max(80),
  recipientEmail: z.email()
});

export type PhysicalFulfillmentInput = z.input<typeof updateInputSchema>;
export type PhysicalFulfillmentResult =
  | {status: 'updated'; physicalStatus: PhysicalFulfillmentStatus; version: number}
  | {status: 'stale'; code: 'physical_state_changed'}
  | {status: 'invalid'; code: 'invalid_physical_transition' | 'invalid_tracking_url' | 'invalid_physical_request'}
  | {status: 'not_found'; code: 'physical_fulfillment_not_found'}
  | {status: 'error'; code: 'physical_update_failed'};

type QueryClient = {
  from: (table: string) => unknown;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type PhysicalRow = {
  id: string;
  order_id: string;
  status: PhysicalFulfillmentStatus;
  version: number;
};

const allowedNext: Record<PhysicalFulfillmentStatus, PhysicalFulfillmentStatus[]> = {
  awaiting_fulfillment: ['packing', 'shipped', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asPhysicalRow(value: unknown): PhysicalRow | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.order_id !== 'string') {
    return null;
  }
  const status = physicalFulfillmentStatusSchema.safeParse(value.status);
  if (!status.success) {
    return null;
  }
  return {
    id: value.id,
    order_id: value.order_id,
    status: status.data,
    version: typeof value.version === 'number' ? value.version : 0
  };
}

function validNext(current: PhysicalFulfillmentStatus, next: PhysicalFulfillmentStatus) {
  return next === current || allowedNext[current].includes(next);
}

async function recordPhysicalFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {
    action: string;
    summary: string;
    orderId?: string;
    orderNumber?: string;
    fulfillmentStatus?: PhysicalFulfillmentStatus;
  }
) {
  if (!recorder) {
    return;
  }
  await recorder({
    area: 'fulfillment',
    severity: 'error',
    errorCode: 'physical_update_failed',
    summary: input.summary,
    facts: {
      action: input.action,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      fulfillmentStatus: input.fulfillmentStatus,
      code: 'physical_update_failed'
    }
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
  const now = new Date().toISOString();
  return {
    status: 'valid' as const,
    update: {
      status: input.status,
      carrier: clean(input.carrier),
      tracking_number: clean(input.trackingNumber),
      tracking_url: trackingUrl,
      admin_note: clean(input.note),
      updated_at: now,
      ...(input.status === 'shipped' ? {shipped_at: now} : {}),
      ...(input.status === 'delivered' ? {delivered_at: now} : {})
    }
  };
}

async function loadPhysical(client: QueryClient, orderId: string) {
  const query = client.from('physical_fulfillments') as {
    select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>}};
  };
  const {data, error} = await query.select('id,order_id,status,version').eq('order_id', orderId).maybeSingle();
  if (error) {
    return {status: 'error' as const};
  }
  return {status: 'found' as const, row: asPhysicalRow(data)};
}

export async function updatePhysicalFulfillment(
  input: PhysicalFulfillmentInput,
  client: QueryClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<PhysicalFulfillmentResult> {
  const parsed = updateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_physical_request'};
  }

  const loaded = await loadPhysical(client, parsed.data.orderId);
  if (loaded.status === 'error') {
    await recordPhysicalFailure(recordOperationalFailure, {
      action: 'lookup',
      summary: 'Physical fulfillment lookup failed',
      orderId: parsed.data.orderId,
      orderNumber: parsed.data.orderNumber,
      fulfillmentStatus: parsed.data.status
    });
    return {status: 'error', code: 'physical_update_failed'};
  }
  if (!loaded.row) {
    return {status: 'not_found', code: 'physical_fulfillment_not_found'};
  }
  if (loaded.row.status !== parsed.data.expectedStatus || loaded.row.version !== parsed.data.expectedVersion) {
    return {status: 'stale', code: 'physical_state_changed'};
  }
  if (!validNext(loaded.row.status, parsed.data.status)) {
    return {status: 'invalid', code: 'invalid_physical_transition'};
  }

  const built = buildPhysicalFulfillmentUpdate(parsed.data);
  if (built.status === 'invalid') {
    return built;
  }
  const nextVersion = loaded.row.version + 1;
  const update = client.from('physical_fulfillments') as {
    update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
  };
  const event = client.from('physical_fulfillment_events') as {
    insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };
  const outbox = client.from('transactional_email_outbox') as {
    insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };

  const updated = await update.update({...built.update, version: nextVersion}).eq('id', loaded.row.id);
  if (updated.error) {
    await recordPhysicalFailure(recordOperationalFailure, {
      action: 'update',
      summary: 'Physical fulfillment update failed',
      orderId: parsed.data.orderId,
      orderNumber: parsed.data.orderNumber,
      fulfillmentStatus: parsed.data.status
    });
    return {status: 'error', code: 'physical_update_failed'};
  }
  await event.insert({
    physical_fulfillment_id: loaded.row.id,
    event_type: `physical_${parsed.data.status}`,
    actor_type: 'admin',
    metadata: {
      status: parsed.data.status,
      carrier: built.update.carrier,
      hasTracking: Boolean(built.update.tracking_number || built.update.tracking_url)
    }
  });
  if (parsed.data.status === 'shipped') {
    const email = await outbox.insert({
      order_id: parsed.data.orderId,
      event_type: 'physical_shipped',
      recipient_email: parsed.data.recipientEmail,
      locale: parsed.data.locale,
      payload: {
        orderNumber: parsed.data.orderNumber,
        carrier: built.update.carrier,
        trackingNumber: built.update.tracking_number,
        trackingUrl: built.update.tracking_url
      }
    });
    if (email.error) {
      await recordPhysicalFailure(recordOperationalFailure, {
        action: 'email_queue',
        summary: 'Physical fulfillment shipped email queue failed',
        orderId: parsed.data.orderId,
        orderNumber: parsed.data.orderNumber,
        fulfillmentStatus: parsed.data.status
      });
      return {status: 'error', code: 'physical_update_failed'};
    }
  }

  return {status: 'updated', physicalStatus: parsed.data.status, version: nextVersion};
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function updatePhysicalFulfillmentAction(formData: FormData): Promise<PhysicalFulfillmentResult> {
  'use server';

  const {requireAdmin} = await import('@/auth/guards');
  await requireAdmin();
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  const {recordOperationalFailure} = await import('@/operations/errors');
  const result = await updatePhysicalFulfillment(
    {
      orderId: formString(formData, 'orderId') ?? '',
      expectedStatus: (formString(formData, 'expectedStatus') ?? '') as PhysicalFulfillmentStatus,
      expectedVersion: formString(formData, 'expectedVersion') ?? '',
      status: (formString(formData, 'status') ?? '') as PhysicalFulfillmentStatus,
      carrier: formString(formData, 'carrier'),
      trackingNumber: formString(formData, 'trackingNumber'),
      trackingUrl: formString(formData, 'trackingUrl'),
      note: formString(formData, 'note'),
      locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en',
      orderNumber: formString(formData, 'orderNumber') ?? '',
      recipientEmail: formString(formData, 'recipientEmail') ?? ''
    },
    createSupabaseAdminClient() as unknown as QueryClient,
    recordOperationalFailure
  );
  revalidatePath('/admin/orders');
  return result;
}

