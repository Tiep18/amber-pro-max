import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { reissueDigitalEntitlement } from '@/fulfillment/entitlements';
import { runMonitoredAction } from '@/operations/monitoring';

const retryInputSchema = z.object({
  emailId: z.uuid(),
  expectedVersion: z.coerce.number().int().min(1)
});

const resendInputSchema = z.object({
  entitlementId: z.uuid(),
  expectedVersion: z.coerce.number().int().min(1)
});

export type AdminEmailActionResult =
  | { status: 'queued' }
  | { status: 'stale'; code: 'email_retry_not_available' }
  | { status: 'invalid'; code: 'invalid_email_action' }
  | { status: 'error'; code: 'email_action_failed' };

async function recordAdminEmailFailure(input: {
  action: string;
  errorCode: string;
  summary: string;
  code: AdminEmailActionResult extends { status: 'error'; code: infer Code } ? Code : string;
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
    errorResult: { status: 'error', code: input.code },
    shouldRecordResult: () => true,
    facts: {
      referenceId: input.emailId ?? null,
      orderId: input.orderId ?? null,
      orderNumber: input.orderNumber ?? null,
      entitlementId: input.entitlementId ?? null,
      emailType: input.emailType ?? null
    },
    operation: async () => ({ status: 'error', code: input.code })
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
  if (
    !normalized ||
    /(authorization|bearer|raw_token|signed_url|provider_payload|object_path|secret)/.test(
      normalized
    )
  ) {
    return 'provider_error';
  }
  return normalized.replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'provider_error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapRetryResult(data: unknown): AdminEmailActionResult {
  if (!isRecord(data) || typeof data.status !== 'string') {
    return { status: 'error', code: 'email_action_failed' };
  }
  if (data.status === 'queued') {
    return { status: 'queued' };
  }
  if (data.status === 'stale' || data.status === 'not_found') {
    return { status: 'stale', code: 'email_retry_not_available' };
  }
  if (data.status === 'invalid') {
    return { status: 'invalid', code: 'invalid_email_action' };
  }
  return { status: 'error', code: 'email_action_failed' };
}

export async function retryTransactionalEmailAction(
  formData: FormData
): Promise<AdminEmailActionResult> {
  'use server';

  const { requireAdmin } = await import('@/auth/guards');
  await requireAdmin();
  const parsed = retryInputSchema.safeParse({
    emailId: getFormString(formData, 'emailId'),
    expectedVersion: getFormString(formData, 'expectedVersion')
  });
  if (!parsed.success) {
    return { status: 'invalid', code: 'invalid_email_action' };
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const client = (await createSupabaseServerClient()) as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await client.rpc('admin_retry_transactional_email', {
    p_outbox_id: parsed.data.emailId,
    p_expected_version: parsed.data.expectedVersion
  });
  if (error) {
    await recordAdminEmailFailure({
      action: 'email_retry',
      errorCode: 'admin_email_retry_failed',
      summary: 'Admin transactional email retry failed',
      code: 'email_action_failed',
      emailId: parsed.data.emailId
    });
    return { status: 'error', code: 'email_action_failed' };
  }

  const result = mapRetryResult(data);
  if (result.status === 'error') {
    await recordAdminEmailFailure({
      action: 'email_retry',
      errorCode: 'admin_email_retry_failed',
      summary: 'Admin transactional email retry failed',
      code: 'email_action_failed',
      emailId: parsed.data.emailId
    });
  }
  if (result.status === 'queued') {
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/[orderNumber]', 'page');
  }
  return result;
}

export async function resendDownloadEmailAction(
  formData: FormData
): Promise<AdminEmailActionResult> {
  'use server';

  const { requireAdmin } = await import('@/auth/guards');
  await requireAdmin();
  const parsed = resendInputSchema.safeParse({
    entitlementId: getFormString(formData, 'entitlementId'),
    expectedVersion: getFormString(formData, 'expectedVersion')
  });
  if (!parsed.success) {
    return { status: 'invalid', code: 'invalid_email_action' };
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const client = (await createSupabaseServerClient()) as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const result = await reissueDigitalEntitlement(parsed.data, client);
  if (result.status === 'reissued') {
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/[orderNumber]', 'page');
    return { status: 'queued' };
  }
  if (result.status === 'stale' || result.status === 'not_found') {
    return { status: 'stale', code: 'email_retry_not_available' };
  }
  if (result.status === 'invalid') {
    return { status: 'invalid', code: 'invalid_email_action' };
  }
  if (result.status === 'error') {
    await recordAdminEmailFailure({
      action: 'download_email_resend',
      errorCode: 'admin_download_resend_failed',
      summary: 'Admin download email resend failed',
      code: 'email_action_failed',
      entitlementId: parsed.data.entitlementId,
      emailType: 'digital_access_reissued'
    });
    return { status: 'error', code: 'email_action_failed' };
  }
  return { status: 'stale', code: 'email_retry_not_available' };
}
