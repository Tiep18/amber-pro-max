import 'server-only';

import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runMonitoredAction } from '@/operations/monitoring';
import { getAuthorizedOrderPayment } from '@/payments/queries';
import {
  createOrderAccess,
  type OrderAccess,
  type OrderAccessCookieStore,
  type OrderAccessOperationalFailure,
  type OrderAccessStore,
  type OrderAccessUser
} from './order-access';

type QueryResult<T = unknown> = Promise<{ data: T; error: unknown }>;
type MaybeSingleSelect<T = unknown> = {
  eq: (column: string, value: string) => MaybeSingleSelect<T>;
  maybeSingle: () => QueryResult<T>;
};
type UpdateChain = {
  eq: (column: string, value: string) => QueryResult<unknown>;
};
type AdminTableClient = {
  select: (columns: string) => MaybeSingleSelect<unknown>;
  update: (value: Record<string, unknown>) => UpdateChain;
  insert: (value: Record<string, unknown>) => QueryResult<unknown>;
};
export type OrderAccessAdminClient = {
  from: (table: string) => AdminTableClient;
  rpc: (fn: string, args: Record<string, unknown>) => QueryResult<unknown>;
};

export type OrderAccessServerClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: unknown;
    }>;
  };
  rpc: (fn: string, args: Record<string, unknown>) => QueryResult<unknown>;
};

type ClaimOrderRow = {
  id: string;
  order_number: string;
  contact_email: string;
  owner_user_id: string | null;
};

type ClaimTokenRow = {
  id: string;
  order_id: string;
  contact_email: string;
  status: string;
  expires_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sameEmail(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function asClaimOrderRow(value: unknown): ClaimOrderRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.order_number !== 'string' ||
    typeof value.contact_email !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    order_number: value.order_number,
    contact_email: value.contact_email,
    owner_user_id:
      typeof value.owner_user_id === 'string' ? value.owner_user_id : null
  };
}

function asClaimTokenRow(value: unknown): ClaimTokenRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.order_id !== 'string' ||
    typeof value.contact_email !== 'string'
  ) {
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

function isTokenUsable(row: ClaimTokenRow | null, nowMs: number) {
  if (!row || row.status !== 'active') {
    return false;
  }
  const expiresMs = Date.parse(row.expires_at);
  return Number.isFinite(expiresMs) && expiresMs > nowMs;
}

/**
 * Request-scoped cookie adapter backed by Next.js `cookies()`, memoizing the
 * awaited store per Order Access instance.
 */
export function createNextCookieStore(): OrderAccessCookieStore {
  let cookieStorePromise: ReturnType<typeof cookies> | null = null;
  const loadCookies = () => (cookieStorePromise ??= cookies());

  return {
    async get(name) {
      const store = await loadCookies();
      return store.get(name);
    },
    async set(name, value, options) {
      const store = await loadCookies();
      store.set(name, value, options);
    },
    async delete(name) {
      const store = await loadCookies();
      store.delete(name);
    }
  };
}

/**
 * Persistence adapter backed by Supabase SSR (buyer auth/reads) and lazy
 * Supabase admin client access only for privileged reopen and claim operations.
 */
export function createSupabaseOrderAccessStore(deps?: {
  getServerClient?: () => Promise<OrderAccessServerClient> | OrderAccessServerClient;
  getAdminClient?: () => OrderAccessAdminClient;
}): OrderAccessStore {
  let serverClientPromise: Promise<OrderAccessServerClient> | null = null;
  const loadServerClient = () => {
    if (!serverClientPromise) {
      serverClientPromise = deps?.getServerClient
        ? Promise.resolve(deps.getServerClient())
        : (createSupabaseServerClient() as unknown as Promise<OrderAccessServerClient>);
    }
    return serverClientPromise;
  };

  let adminClient: OrderAccessAdminClient | null = null;
  const loadAdminClient = () => {
    if (!adminClient) {
      adminClient = deps?.getAdminClient
        ? deps.getAdminClient()
        : (createSupabaseAdminClient() as unknown as OrderAccessAdminClient);
    }
    return adminClient;
  };

  return {
    async getCurrentUser(): Promise<OrderAccessUser | null> {
      const client = await loadServerClient();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        return null;
      }
      return {
        id: data.user.id,
        email: data.user.email ?? null
      };
    },

    async findAuthorizedOrder({ orderNumber, guestSecretHash }) {
      const client = await loadServerClient();
      return getAuthorizedOrderPayment({
        orderNumber,
        guestSecretHash,
        client: client as never
      });
    },

    async requestGuestOrderEmail(input) {
      const admin = loadAdminClient();
      const { data, error } = await admin.rpc('request_guest_order_email', {
        p_order_number: input.orderNumber,
        p_email: input.email,
        p_locale: input.locale,
        p_purpose: input.purpose,
        p_target_hash: input.targetHash,
        p_ip_hash: input.ipHash
      });
      if (error || !isRecord(data) || data.status !== 'sent') {
        return { status: 'failed' };
      }
      return { status: 'sent' };
    },

    async redeemReopenToken(input) {
      const admin = loadAdminClient();
      const { data, error } = await admin.rpc('redeem_guest_order_reopen_token', {
        p_order_number: input.orderNumber,
        p_token_hash: input.tokenHash,
        p_new_guest_secret_hash: input.newGuestSecretHash
      });
      if (
        error ||
        !isRecord(data) ||
        data.status !== 'granted' ||
        typeof data.orderNumber !== 'string'
      ) {
        return { status: 'denied' };
      }

      return {
        status: 'granted',
        orderNumber: data.orderNumber,
        paid: data.paid === true,
        reservationExpiresAt:
          typeof data.reservationExpiresAt === 'string'
            ? data.reservationExpiresAt
            : null
      };
    },

    async claimOrder(input) {
      const admin = loadAdminClient();
      const orderLookup = await admin
        .from('checkout_orders')
        .select('id,order_number,contact_email,owner_user_id')
        .eq('order_number', input.orderNumber)
        .maybeSingle();
      const orderRow = orderLookup.error ? null : asClaimOrderRow(orderLookup.data);
      if (
        !orderRow ||
        orderRow.owner_user_id ||
        !sameEmail(orderRow.contact_email, input.userEmail)
      ) {
        return { status: 'denied' };
      }

      const tokenLookup = await admin
        .from('guest_order_access_tokens')
        .select('id,order_id,contact_email,status,expires_at')
        .eq('order_id', orderRow.id)
        .eq('purpose', 'claim_order')
        .eq('token_hash', input.tokenHash)
        .maybeSingle();
      const tokenRow = tokenLookup.error ? null : asClaimTokenRow(tokenLookup.data);
      const nowMs = Date.parse(input.nowIso);
      if (
        !isTokenUsable(tokenRow, Number.isFinite(nowMs) ? nowMs : Date.now()) ||
        !tokenRow ||
        !sameEmail(tokenRow.contact_email, input.userEmail)
      ) {
        return { status: 'denied' };
      }

      try {
        const orderUpdate = await admin
          .from('checkout_orders')
          .update({ owner_user_id: input.userId, updated_at: input.nowIso })
          .eq('id', orderRow.id);
        if (orderUpdate.error) {
          return {
            status: 'failed',
            stage: 'order_update_failed',
            orderId: orderRow.id,
            orderNumber: orderRow.order_number
          };
        }

        const tokenUpdate = await admin
          .from('guest_order_access_tokens')
          .update({
            status: 'revoked',
            revoked_at: input.nowIso,
            consumed_at: input.nowIso
          })
          .eq('order_id', orderRow.id);
        if (tokenUpdate.error) {
          return {
            status: 'failed',
            stage: 'token_revoke_failed',
            orderId: orderRow.id,
            orderNumber: orderRow.order_number
          };
        }

        const auditInsert = await admin.from('fulfillment_audit_events').insert({
          event_key: `guest_order_claim:${orderRow.id}:${tokenRow.id}`,
          order_id: orderRow.id,
          event_type: 'guest_order_claim',
          actor_type: 'customer',
          actor_id: input.userId,
          metadata: { orderNumber: orderRow.order_number }
        });
        if (auditInsert.error) {
          return {
            status: 'failed',
            stage: 'audit_insert_failed',
            orderId: orderRow.id,
            orderNumber: orderRow.order_number
          };
        }

        return {
          status: 'claimed',
          orderId: orderRow.id,
          orderNumber: orderRow.order_number
        };
      } catch {
        return {
          status: 'failed',
          stage: 'unexpected_exception',
          orderId: orderRow.id,
          orderNumber: orderRow.order_number
        };
      }
    }
  };
}

function recordOrderAccessOperationalFailure(
  input: OrderAccessOperationalFailure
) {
  return runMonitoredAction({
    area: 'fulfillment',
    action: input.action,
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: { status: 'error', code: input.code ?? input.errorCode },
    shouldRecordResult: () => true,
    facts: {
      orderNumber: input.orderNumber,
      referenceId: input.referenceId ?? null,
      status: input.status ?? null
    },
    operation: async () => ({
      status: 'error',
      code: input.code ?? input.errorCode
    })
  });
}

/**
 * Instantiate the server Order Access module wired to Next.js cookies,
 * Supabase SSR/admin clients, and monitored failure recording.
 */
export function createServerOrderAccess(): OrderAccess {
  return createOrderAccess({
    cookies: createNextCookieStore(),
    store: createSupabaseOrderAccessStore(),
    recordOperationalFailure: recordOrderAccessOperationalFailure
  });
}
