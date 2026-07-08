import {createHash, randomBytes} from 'node:crypto';
import {z} from 'zod';
import {recordOperationalFailure} from '@/operations/errors';

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (value: Record<string, unknown>) => QueryBuilder;
  update: (value: Record<string, unknown>) => QueryBuilder;
  maybeSingle: () => Promise<{data: Record<string, unknown> | null; error: unknown}>;
  single: () => Promise<{data: Record<string, unknown> | null; error: unknown}>;
} & PromiseLike<{data?: unknown; error: unknown}>;

type UntypedSupabaseClient = RpcClient & {
  from: (table: string) => QueryBuilder;
};

const exceptionRequestSchema = z.object({
  contactEmail: z.email().max(320),
  customerNote: z.string().trim().max(1000).optional().default(''),
  productId: z.guid(),
  variantId: z.guid().optional().nullable(),
  market: z.enum(['vn', 'intl']),
  destinationCountryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  locale: z.enum(['vi', 'en'])
});

const approvalSchema = z.object({
  requestId: z.guid(),
  shippingFeeMinor: z.number().int().min(0),
  currencyCode: z.enum(['VND', 'USD']),
  adminNote: z.string().trim().max(1000).optional().default('')
});

const rejectionSchema = z.object({
  requestId: z.guid(),
  reason: z.string().trim().min(1).max(1000)
});

export type CreateExceptionRequestResult =
  | {status: 'created'; requestId: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: string};

export type ApproveExceptionRequestResult =
  | {status: 'approved'; grantId: string; token: string; expiresAt: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: string};

export type ValidateExceptionGrantResult =
  | {status: 'valid'; grantId: string; expiresAt: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: string};

export function hashExceptionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createExceptionToken() {
  return randomBytes(32).toString('hex');
}

export function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) {
    return email;
  }
  return `${name[0]}***@${domain}`;
}

async function recordExceptionFailure(input: {
  action: string;
  errorCode: string;
  summary: string;
  code: string;
  productId?: string | null;
  referenceId?: string | null;
  market?: 'vn' | 'intl' | null;
  currency?: 'VND' | 'USD' | null;
  amountValue?: number | null;
}) {
  await recordOperationalFailure({
    area: 'checkout',
    severity: 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      action: input.action,
      productId: input.productId ?? null,
      referenceId: input.referenceId ?? null,
      market: input.market ?? null,
      currency: input.currency ?? null,
      amountValue: input.amountValue ?? null,
      code: input.code
    }
  });
}

function mapCreateResult(value: unknown): CreateExceptionRequestResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {status: 'error', code: 'exception_request_failed'};
  }
  const row = value as Record<string, unknown>;
  if (row.status === 'created' && typeof row.requestId === 'string') {
    return {status: 'created', requestId: row.requestId};
  }
  if (row.status === 'invalid' && typeof row.code === 'string') {
    return {status: 'invalid', code: row.code};
  }
  return {status: 'error', code: 'exception_request_failed'};
}

export async function createExceptionRequest(input: unknown, client?: RpcClient): Promise<CreateExceptionRequestResult> {
  const parsed = exceptionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_exception_request'};
  }
  const supabase = client ?? (await createServerClient());
  const {data, error} = await supabase.rpc('create_market_exception_request', {p_payload: parsed.data});
  if (error) {
    await recordExceptionFailure({
      action: 'exception_request_create',
      errorCode: 'checkout_exception_request_failed',
      summary: 'Checkout exception request failed',
      code: 'exception_request_failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.variantId ?? null,
      market: parsed.data.market
    });
    return {status: 'error', code: 'exception_request_failed'};
  }
  return mapCreateResult(data);
}

export async function approveExceptionRequest(input: unknown): Promise<ApproveExceptionRequestResult> {
  const [{requireAdmin}, {revalidatePath}] = await Promise.all([import('@/auth/guards'), import('next/cache')]);
  const admin = await requireAdmin();
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_exception_approval'};
  }
  const supabase = (await createServerClient()) as UntypedSupabaseClient;
  const {data: request, error: requestError} = await supabase
    .from('market_exception_requests')
    .select('id,product_id,variant_id,market,destination_country_code,status')
    .eq('id', parsed.data.requestId)
    .maybeSingle();
  if (requestError) {
    await recordExceptionFailure({
      action: 'exception_request_lookup',
      errorCode: 'checkout_exception_request_lookup_failed',
      summary: 'Checkout exception request lookup failed',
      code: 'invalid_exception_request',
      referenceId: parsed.data.requestId
    });
    return {status: 'invalid', code: 'invalid_exception_request'};
  }
  if (!request || request.status !== 'pending') {
    return {status: 'invalid', code: 'invalid_exception_request'};
  }

  const token = createExceptionToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const {data: grant, error: grantError} = await supabase
    .from('market_exception_grants')
    .insert({
      request_id: request.id,
      token_hash: hashExceptionToken(token),
      product_id: request.product_id,
      variant_id: request.variant_id,
      market: request.market,
      destination_country_code: request.destination_country_code,
      shipping_fee_minor: parsed.data.shippingFeeMinor,
      currency_code: parsed.data.currencyCode,
      expires_at: expiresAt,
      created_by: admin.id
    })
    .select('id')
    .single();
  if (grantError || !grant) {
    await recordExceptionFailure({
      action: 'exception_request_approve',
      errorCode: 'checkout_exception_approval_failed',
      summary: 'Checkout exception approval failed',
      code: 'exception_approval_failed',
      productId: typeof request.product_id === 'string' ? request.product_id : null,
      referenceId: String(request.id),
      market: request.market === 'vn' || request.market === 'intl' ? request.market : null,
      currency: parsed.data.currencyCode,
      amountValue: parsed.data.shippingFeeMinor
    });
    return {status: 'error', code: 'exception_approval_failed'};
  }

  const approvalUpdate = await supabase
    .from('market_exception_requests')
    .update({
      status: 'approved',
      admin_note: parsed.data.adminNote,
      decided_by: admin.id,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', request.id);
  if (approvalUpdate.error) {
    await recordExceptionFailure({
      action: 'exception_request_mark_approved',
      errorCode: 'checkout_exception_approval_update_failed',
      summary: 'Checkout exception approval status update failed',
      code: 'exception_approval_failed',
      productId: typeof request.product_id === 'string' ? request.product_id : null,
      referenceId: String(request.id),
      market: request.market === 'vn' || request.market === 'intl' ? request.market : null
    });
  }
  revalidatePath('/admin/exceptions');
  return {status: 'approved', grantId: String(grant.id), token, expiresAt};
}

export async function rejectExceptionRequest(input: unknown) {
  const [{requireAdmin}, {revalidatePath}] = await Promise.all([import('@/auth/guards'), import('next/cache')]);
  const admin = await requireAdmin();
  const parsed = rejectionSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_exception_rejection'} as const;
  }
  const supabase = (await createServerClient()) as UntypedSupabaseClient;
  const {error} = await supabase
    .from('market_exception_requests')
    .update({
      status: 'rejected',
      rejection_reason: parsed.data.reason,
      decided_by: admin.id,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', parsed.data.requestId)
    .eq('status', 'pending');
  revalidatePath('/admin/exceptions');
  if (error) {
    await recordExceptionFailure({
      action: 'exception_request_reject',
      errorCode: 'checkout_exception_rejection_failed',
      summary: 'Checkout exception rejection failed',
      code: 'exception_rejection_failed',
      referenceId: parsed.data.requestId
    });
    return {status: 'error', code: 'exception_rejection_failed'} as const;
  }
  return {status: 'rejected'} as const;
}

export async function validateExceptionGrant(
  input: {token: string},
  client?: RpcClient
): Promise<ValidateExceptionGrantResult> {
  const token = input.token.trim();
  if (!token) {
    return {status: 'invalid', code: 'invalid_or_expired'};
  }
  const supabase = client ?? (await createServerClient());
  const {data, error} = await supabase.rpc('validate_market_exception_grant', {
    p_token_hash: hashExceptionToken(token)
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    await recordExceptionFailure({
      action: 'exception_grant_validate',
      errorCode: 'checkout_exception_grant_failed',
      summary: 'Checkout exception grant validation failed',
      code: 'exception_grant_failed'
    });
    return {status: 'error', code: 'exception_grant_failed'};
  }
  const row = data as Record<string, unknown>;
  if (row.status === 'valid' && typeof row.grantId === 'string' && typeof row.expiresAt === 'string') {
    return {status: 'valid', grantId: row.grantId, expiresAt: row.expiresAt};
  }
  return {status: 'invalid', code: typeof row.code === 'string' ? row.code : 'invalid_or_expired'};
}

async function createServerClient(): Promise<UntypedSupabaseClient> {
  const {createSupabaseServerClient} = await import('@/lib/supabase/server');
  return createSupabaseServerClient() as unknown as UntypedSupabaseClient;
}
