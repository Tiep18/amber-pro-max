'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/auth/guards';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeOperationalErrorInput } from './redaction';

export type RecordOperationalErrorResult =
  | { status: 'recorded'; errorId: string }
  | { status: 'error'; code: 'operational_error_record_failed' };

export type MarkOperationalErrorResolvedResult =
  | { status: 'resolved'; errorId: string }
  | { status: 'invalid'; code: 'invalid_error_id' }
  | { status: 'error'; code: 'operational_error_resolve_failed' };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function logOperationalRecordFailure(sanitized: ReturnType<typeof sanitizeOperationalErrorInput>) {
  console.error(
    '[operational-error] record_failed',
    JSON.stringify({
      area: sanitized.area,
      severity: sanitized.severity,
      errorCode: sanitized.errorCode,
      summary: sanitized.summary,
      facts: sanitized.facts
    })
  );
}

export async function recordOperationalError(input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}): Promise<RecordOperationalErrorResult> {
  const sanitized = sanitizeOperationalErrorInput(input);
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('operational_errors')
    .insert({
      area: sanitized.area,
      severity: sanitized.severity,
      error_code: sanitized.errorCode,
      summary: sanitized.summary,
      sanitized_facts: sanitized.facts
    })
    .select('id')
    .single();

  if (error || !data) {
    return { status: 'error', code: 'operational_error_record_failed' };
  }

  return { status: 'recorded', errorId: data.id };
}

export async function recordOperationalFailure(input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}): Promise<RecordOperationalErrorResult> {
  const sanitized = sanitizeOperationalErrorInput(input);
  try {
    const result = await recordOperationalError(sanitized);
    if (result.status === 'error') {
      logOperationalRecordFailure(sanitized);
    }
    return result;
  } catch {
    logOperationalRecordFailure(sanitized);
    return { status: 'error', code: 'operational_error_record_failed' };
  }
}

export async function markOperationalErrorResolved(
  errorId: string
): Promise<MarkOperationalErrorResolvedResult> {
  const admin = await requireAdmin();
  if (!uuidPattern.test(errorId)) {
    return { status: 'invalid', code: 'invalid_error_id' };
  }

  const client = await createSupabaseServerClient();
  const { error } = await client
    .from('operational_errors')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: admin.id
    })
    .eq('id', errorId);

  if (error) {
    return { status: 'error', code: 'operational_error_resolve_failed' };
  }

  revalidatePath('/admin/operations');
  return { status: 'resolved', errorId };
}

export async function markOperationalErrorResolvedAction(
  formData: FormData
): Promise<MarkOperationalErrorResolvedResult> {
  const errorId = formData.get('errorId');
  if (typeof errorId !== 'string') {
    return { status: 'invalid', code: 'invalid_error_id' };
  }
  return markOperationalErrorResolved(errorId);
}
