import {z} from 'zod';
import type {AuthUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {recordOperationalFailure} from '@/operations/errors';
import {hashGuestOrderAccessToken} from '@/payments/guest-access';

const reopenSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  email: z.email(),
  locale: z.enum(['en', 'vi'])
});

const claimSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  rawToken: z.string().trim().min(1).max(512),
  user: z.object({id: z.uuid(), email: z.email()})
});

type QueryClient = {
  from: (table: string) => unknown;
};

type OrderRow = {
  id: string;
  order_number: string;
  contact_email: string;
  locale?: Locale;
  owner_user_id?: string | null;
};

type GuestTokenRow = {
  id: string;
  order_id: string;
  contact_email: string;
  status: string;
  expires_at: string;
};

export type GuestReopenResult = {status: 'sent'};
export type ClaimGuestOrderResult =
  | {status: 'claimed'}
  | {status: 'denied'; code: 'claim_not_available'}
  | {status: 'invalid'; code: 'invalid_claim_request'}
  | {status: 'error'; code: 'claim_failed'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sameEmail(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function asOrderRow(value: unknown): OrderRow | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.order_number !== 'string' || typeof value.contact_email !== 'string') {
    return null;
  }
  return {
    id: value.id,
    order_number: value.order_number,
    contact_email: value.contact_email,
    locale: value.locale === 'vi' ? 'vi' : 'en',
    owner_user_id: typeof value.owner_user_id === 'string' ? value.owner_user_id : null
  };
}

function asTokenRow(value: unknown): GuestTokenRow | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.order_id !== 'string' || typeof value.contact_email !== 'string') {
    return null;
  }
  return {
    id: value.id,
    order_id: value.order_id,
    contact_email: value.contact_email,
    status: typeof value.status === 'string' ? value.status : 'active',
    expires_at: typeof value.expires_at === 'string' ? value.expires_at : ''
  };
}

async function findOrderByNumberAndEmail(client: QueryClient, orderNumber: string, email: string) {
  const query = client.from('checkout_orders') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>};
      };
    };
  };
  const {data, error} = await query.select('id,order_number,contact_email,locale,owner_user_id').eq('order_number', orderNumber).eq('contact_email', email).maybeSingle();
  if (error) {
    return null;
  }
  return asOrderRow(data);
}

async function findOrderByNumber(client: QueryClient, orderNumber: string) {
  const query = client.from('checkout_orders') as {
    select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>}};
  };
  const {data, error} = await query.select('id,order_number,contact_email,owner_user_id').eq('order_number', orderNumber).maybeSingle();
  if (error) {
    return null;
  }
  return asOrderRow(data);
}

async function findClaimToken(client: QueryClient, orderId: string, rawToken: string) {
  const query = client.from('guest_order_access_tokens') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>};
        };
      };
    };
  };
  const {data, error} = await query
    .select('id,order_id,contact_email,status,expires_at')
    .eq('order_id', orderId)
    .eq('purpose', 'claim_order')
    .eq('token_hash', hashGuestOrderAccessToken(rawToken))
    .maybeSingle();
  if (error) {
    return null;
  }
  return asTokenRow(data);
}

function tokenUsable(row: GuestTokenRow | null, now = new Date()) {
  if (!row || row.status !== 'active') {
    return false;
  }
  const expiresMs = Date.parse(row.expires_at);
  return Number.isFinite(expiresMs) && expiresMs > now.getTime();
}

async function recordGuestOrderFailure({
  action,
  orderNumber,
  errorCode,
  summary,
  code,
  referenceId,
  status
}: {
  action: 'guest_order_reopen' | 'guest_order_claim_email' | 'guest_order_claim';
  orderNumber: string;
  errorCode: string;
  summary: string;
  code?: string;
  referenceId?: string | null;
  status?: string | null;
}) {
  await recordOperationalFailure({
    area: 'fulfillment',
    severity: 'error',
    errorCode,
    summary,
    facts: {
      action,
      orderNumber,
      referenceId: referenceId ?? null,
      status: status ?? null,
      code: code ?? null
    }
  });
}

export async function requestGuestOrderReopen(input: z.input<typeof reopenSchema>, client: QueryClient): Promise<GuestReopenResult> {
  const parsed = reopenSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'sent'};
  }

  const order = await findOrderByNumberAndEmail(client, parsed.data.orderNumber, parsed.data.email);
  if (!order) {
    return {status: 'sent'};
  }

  const outbox = client.from('transactional_email_outbox') as {
    insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };
  const {error} = await outbox.insert({
    order_id: order.id,
    event_type: 'guest_order_reopen',
    recipient_email: order.contact_email,
    locale: order.locale ?? parsed.data.locale,
    payload: {orderNumber: order.order_number, expiresInHours: 24}
  });
  if (error) {
    await recordGuestOrderFailure({
      action: 'guest_order_reopen',
      orderNumber: order.order_number,
      referenceId: order.id,
      errorCode: 'guest_order.reopen_email_enqueue_failed',
      summary: 'Guest order reopen email enqueue failed'
    });
  }
  return {status: 'sent'};
}

export async function requestGuestOrderClaimEmail(input: z.input<typeof reopenSchema>, client: QueryClient): Promise<GuestReopenResult> {
  const parsed = reopenSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'sent'};
  }

  const order = await findOrderByNumberAndEmail(client, parsed.data.orderNumber, parsed.data.email);
  if (!order || order.owner_user_id) {
    return {status: 'sent'};
  }

  const outbox = client.from('transactional_email_outbox') as {
    insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  };
  const {error} = await outbox.insert({
    order_id: order.id,
    event_type: 'guest_order_claim',
    recipient_email: order.contact_email,
    locale: order.locale ?? parsed.data.locale,
    payload: {orderNumber: order.order_number, expiresInHours: 24}
  });
  if (error) {
    await recordGuestOrderFailure({
      action: 'guest_order_claim_email',
      orderNumber: order.order_number,
      referenceId: order.id,
      errorCode: 'guest_order.claim_email_enqueue_failed',
      summary: 'Guest order claim email enqueue failed'
    });
  }
  return {status: 'sent'};
}

export async function claimGuestOrder(input: z.input<typeof claimSchema>, client: QueryClient): Promise<ClaimGuestOrderResult> {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_claim_request'};
  }

  const order = await findOrderByNumber(client, parsed.data.orderNumber);
  if (!order || order.owner_user_id || !sameEmail(order.contact_email, parsed.data.user.email)) {
    return {status: 'denied', code: 'claim_not_available'};
  }

  const token = await findClaimToken(client, order.id, parsed.data.rawToken);
  if (!tokenUsable(token) || !token || !sameEmail(token.contact_email, parsed.data.user.email)) {
    return {status: 'denied', code: 'claim_not_available'};
  }

  try {
    const orders = client.from('checkout_orders') as {
      update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
    };
    const tokenTable = client.from('guest_order_access_tokens') as {
      update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
    };
    const audit = client.from('fulfillment_audit_events') as {
      insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
    };
    const now = new Date().toISOString();
    const orderUpdate = await orders.update({owner_user_id: parsed.data.user.id, updated_at: now}).eq('id', order.id);
    if (orderUpdate.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim owner update failed',
        code: 'claim_failed',
        status: 'order_update_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    const tokenUpdate = await tokenTable.update({status: 'revoked', revoked_at: now, consumed_at: now}).eq('order_id', order.id);
    if (tokenUpdate.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim token revoke failed',
        code: 'claim_failed',
        status: 'token_revoke_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    const auditInsert = await audit.insert({
      event_key: `guest_order_claim:${order.id}:${token.id}`,
      order_id: order.id,
      event_type: 'guest_order_claim',
      actor_type: 'customer',
      actor_id: parsed.data.user.id,
      metadata: {orderNumber: order.order_number}
    });
    if (auditInsert.error) {
      await recordGuestOrderFailure({
        action: 'guest_order_claim',
        orderNumber: order.order_number,
        referenceId: order.id,
        errorCode: 'guest_order.claim_failed',
        summary: 'Guest order claim audit insert failed',
        code: 'claim_failed',
        status: 'audit_insert_failed'
      });
      return {status: 'error', code: 'claim_failed'};
    }
    return {status: 'claimed'};
  } catch {
    await recordGuestOrderFailure({
      action: 'guest_order_claim',
      orderNumber: order.order_number,
      referenceId: order.id,
      errorCode: 'guest_order.claim_failed',
      summary: 'Guest order claim mutation threw an exception',
      code: 'claim_failed'
    });
    return {status: 'error', code: 'claim_failed'};
  }
}

export async function requestGuestOrderReopenWithAdminClient(input: z.input<typeof reopenSchema>) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return requestGuestOrderReopen(input, createSupabaseAdminClient() as unknown as QueryClient);
}

export async function requestGuestOrderClaimEmailWithAdminClient(input: z.input<typeof reopenSchema>) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return requestGuestOrderClaimEmail(input, createSupabaseAdminClient() as unknown as QueryClient);
}

export async function claimGuestOrderWithAdminClient(input: {orderNumber: string; rawToken: string; user: AuthUser}) {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return claimGuestOrder(input, createSupabaseAdminClient() as unknown as QueryClient);
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function requestGuestOrderReopenAction(formData: FormData): Promise<GuestReopenResult> {
  'use server';

  return requestGuestOrderReopenWithAdminClient({
    orderNumber: formString(formData, 'orderNumber'),
    email: formString(formData, 'email'),
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en'
  });
}

export async function requestGuestOrderClaimEmailAction(formData: FormData): Promise<GuestReopenResult> {
  'use server';

  return requestGuestOrderClaimEmailWithAdminClient({
    orderNumber: formString(formData, 'orderNumber'),
    email: formString(formData, 'email'),
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en'
  });
}

export async function claimGuestOrderAction(formData: FormData): Promise<ClaimGuestOrderResult> {
  'use server';

  const locale = formString(formData, 'locale') === 'vi' ? 'vi' : 'en';
  const orderNumber = formString(formData, 'orderNumber');
  const {requireUser} = await import('@/auth/guards');
  const claimPath = '/' + locale + '/' + (locale === 'vi' ? 'don-hang' : 'orders') + '/' + encodeURIComponent(orderNumber) + '/claim';
  const user = await requireUser({locale, next: claimPath});
  return claimGuestOrderWithAdminClient({
    orderNumber,
    rawToken: formString(formData, 'token'),
    user
  });
}
