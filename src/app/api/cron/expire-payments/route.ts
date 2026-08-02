import {createHash, timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env/server';
import type {Json} from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOB_NAME = 'trusted-payment-expiry-http';

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

function bearerSecret(request: Request) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : null;
}

function hasValidSecret(request: Request, expected: string) {
  const provided = bearerSecret(request);
  if (!provided) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}

async function recordRun(status: 'succeeded' | 'failed', detail: Record<string, Json>) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('system_job_runs').insert({job_name: JOB_NAME, status, detail});
  } catch {
    // Best-effort telemetry; must never fail the request.
  }
}

async function handleExpiry(request: Request) {
  const env = getServerEnv();
  if (!env.cronSecret || !hasValidSecret(request, env.cronSecret)) {
    return json(404, {status: 'not_found'});
  }

  try {
    const admin = createSupabaseAdminClient();
    const {data, error} = await admin.rpc('expire_due_payments', {p_limit: 100});
    if (error) {
      await recordRun('failed', {code: 'expire_due_payments_failed'});
      return json(500, {status: 'error', code: 'expire_due_payments_failed'});
    }

    const processed = isRecord(data) && typeof data.processed === 'number' ? data.processed : 0;
    await recordRun('succeeded', {processed});
    return json(200, {status: 'ok', processed});
  } catch {
    await recordRun('failed', {code: 'expire_due_payments_threw'});
    return json(500, {status: 'error', code: 'expire_due_payments_threw'});
  }
}

// Vercel Cron Jobs invoke via GET with an automatic Authorization: Bearer
// $CRON_SECRET header. POST is also accepted for manual/operator triggers
// using the same secret.
export async function GET(request: Request) {
  return handleExpiry(request);
}

export async function POST(request: Request) {
  return handleExpiry(request);
}
