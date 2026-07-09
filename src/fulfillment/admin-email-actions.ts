import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';


const retryInputSchema = z.object({
  emailId: z.string().trim().min(1).max(120)
});

const resendInputSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  orderNumber: z.string().trim().min(1).max(80),
  entitlementId: z.string().trim().min(1).max(120),
  recipientEmail: z.email().optional(),
  locale: z.enum(['en', 'vi']).default('en')
});

export type AdminEmailActionResult =
  | {status: 'queued'}
  | {status: 'stale'; code: 'email_retry_not_available'}
  | {status: 'invalid'; code: 'invalid_email_action'}
  | {status: 'error'; code: 'email_action_failed'};

type RetryCandidate = {
  status: string;
  availableAt: string | null;
};

async function recordAdminEmailFailure(input: {
  action: string;
  errorCode: string;
  summary: string;
  code: AdminEmailActionResult extends {status: 'error'; code: infer Code} ? Code : string;
  emailId?: string;
  orderId?: string;
  orderNumber?: string;
  entitlementId?: string;
  emailType?: string;
}) {
  await runMonitoredAction({
    area: 'email',
    action: input.action,
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: {status: 'error', code: input.code},
    shouldRecordResult: () => true,
    facts: {
      referenceId: input.emailId ?? null,
      orderId: input.orderId ?? null,
      orderNumber: input.orderNumber ?? null,
      entitlementId: input.entitlementId ?? null,
      emailType: input.emailType ?? null
    },
    operation: async () => ({status: 'error', code: input.code})
  });
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export function maskEmailForAdmin(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) {
    return 'masked';
  }
  if (name.length <= 2) {
    return `${name[0] ?? '*'}***@${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export function sanitizeEmailFailureCode(value: string | null | undefined) {
  const normalized = (value ?? '').toLowerCase();
  if (!normalized || /(authorization|bearer|raw_token|signed_url|provider_payload|object_path|secret)/.test(normalized)) {
    return 'provider_error';
  }
  return normalized.replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'provider_error';
}

export function validateRetryCandidate(row: RetryCandidate, now = new Date()) {
  if (row.status === 'failed') {
    return {status: 'retryable' as const};
  }
  if (row.status === 'pending') {
    const availableMs = row.availableAt ? Date.parse(row.availableAt) : Number.NaN;
    if (!Number.isFinite(availableMs) || availableMs <= now.getTime()) {
      return {status: 'retryable' as const};
    }
  }
  return {status: 'stale' as const, code: 'email_retry_not_available' as const};
}

export function buildDownloadResendIntent(input: {
  orderId: string;
  orderNumber: string;
  entitlementId: string;
  recipientEmail: string;
  locale: 'en' | 'vi';
  adminId: string;
}) {
  return {
    outbox: {
      order_id: input.orderId,
      entitlement_id: input.entitlementId,
      event_type: 'digital_access_reissued',
      recipient_email: input.recipientEmail,
      locale: input.locale,
      payload: {
        orderNumber: input.orderNumber,
        expiresInHours: 24
      }
    },
    audit: {
      event_key: `digital_access_resend_requested:${input.entitlementId}:${Date.now()}`,
      order_id: input.orderId,
      entitlement_id: input.entitlementId,
      event_type: 'digital_access_resend_requested',
      actor_type: 'admin',
      actor_id: input.adminId,
      metadata: {
        orderNumber: input.orderNumber
      }
    }
  };
}

export async function retryTransactionalEmailAction(formData: FormData): Promise<AdminEmailActionResult> {
  'use server';

  const {requireAdmin} = await import('@/auth/guards');
  await requireAdmin();
  const parsed = retryInputSchema.safeParse({emailId: getFormString(formData, 'emailId')});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_email_action'};
  }

  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  const client = createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>}};
      update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
    };
  };
  const {data, error} = await client.from('transactional_email_outbox').select('id,status,available_at').eq('id', parsed.data.emailId).maybeSingle();
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    await recordAdminEmailFailure({
      action: 'email_retry_lookup',
      errorCode: 'admin_email_retry_lookup_failed',
      summary: 'Admin transactional email retry lookup failed',
      code: 'email_action_failed',
      emailId: parsed.data.emailId
    });
    return {status: 'error', code: 'email_action_failed'};
  }

  const row = data as {status?: unknown; available_at?: unknown};
  const candidate = validateRetryCandidate(
    {
      status: typeof row.status === 'string' ? row.status : '',
      availableAt: typeof row.available_at === 'string' ? row.available_at : null
    },
    new Date()
  );
  if (candidate.status !== 'retryable') {
    return candidate;
  }

  const retryUpdate = await client.from('transactional_email_outbox').update({status: 'pending', available_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', parsed.data.emailId);
  if (retryUpdate.error) {
    await recordAdminEmailFailure({
      action: 'email_retry',
      errorCode: 'admin_email_retry_failed',
      summary: 'Admin transactional email retry failed',
      code: 'email_action_failed',
      emailId: parsed.data.emailId
    });
    return {status: 'error', code: 'email_action_failed'};
  }
  revalidatePath('/admin/orders');
  return {status: 'queued'};
}

export async function resendDownloadEmailAction(formData: FormData): Promise<AdminEmailActionResult> {
  'use server';

  const {requireAdmin} = await import('@/auth/guards');
  const admin = await requireAdmin();
  const parsed = resendInputSchema.safeParse({
    orderId: getFormString(formData, 'orderId'),
    orderNumber: getFormString(formData, 'orderNumber'),
    entitlementId: getFormString(formData, 'entitlementId'),
    recipientEmail: getFormString(formData, 'recipientEmail'),
    locale: getFormString(formData, 'locale') ?? 'en'
  });
  if (!parsed.success || typeof admin !== 'object' || !admin || !('id' in admin) || typeof admin.id !== 'string') {
    return {status: 'invalid', code: 'invalid_email_action'};
  }

  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  const client = createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>}};
      insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
    };
  };
  let recipientEmail = parsed.data.recipientEmail;
  if (!recipientEmail) {
    const entitlement = await client.from('digital_entitlements').select('contact_email').eq('id', parsed.data.entitlementId).maybeSingle();
    if (entitlement.error || !entitlement.data || typeof entitlement.data !== 'object' || Array.isArray(entitlement.data)) {
      await recordAdminEmailFailure({
        action: 'download_email_recipient_lookup',
        errorCode: 'admin_download_resend_recipient_lookup_failed',
        summary: 'Admin download email recipient lookup failed',
        code: 'email_action_failed',
        orderId: parsed.data.orderId,
        orderNumber: parsed.data.orderNumber,
        entitlementId: parsed.data.entitlementId,
        emailType: 'digital_access_reissued'
      });
      return {status: 'error', code: 'email_action_failed'};
    }
    const row = entitlement.data as {contact_email?: unknown};
    recipientEmail = typeof row.contact_email === 'string' ? row.contact_email : undefined;
  }
  if (!recipientEmail) {
    await recordAdminEmailFailure({
      action: 'download_email_recipient_missing',
      errorCode: 'admin_download_resend_recipient_missing',
      summary: 'Admin download email recipient missing',
      code: 'email_action_failed',
      orderId: parsed.data.orderId,
      orderNumber: parsed.data.orderNumber,
      entitlementId: parsed.data.entitlementId,
      emailType: 'digital_access_reissued'
    });
    return {status: 'error', code: 'email_action_failed'};
  }

  const intent = buildDownloadResendIntent({...parsed.data, recipientEmail, adminId: admin.id});
  const outbox = await client.from('transactional_email_outbox').insert(intent.outbox);
  const audit = await client.from('fulfillment_audit_events').insert(intent.audit);
  if (outbox.error || audit.error) {
    await recordAdminEmailFailure({
      action: 'download_email_resend',
      errorCode: 'admin_download_resend_failed',
      summary: 'Admin download email resend failed',
      code: 'email_action_failed',
      orderId: parsed.data.orderId,
      orderNumber: parsed.data.orderNumber,
      entitlementId: parsed.data.entitlementId,
      emailType: 'digital_access_reissued'
    });
    return {status: 'error', code: 'email_action_failed'};
  }
  revalidatePath('/admin/orders');
  return {status: 'queued'};
}
