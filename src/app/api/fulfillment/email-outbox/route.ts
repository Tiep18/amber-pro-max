import {NextResponse} from 'next/server';

import {processTransactionalEmailBatch} from '@/fulfillment/email-outbox';
import {getServerEnv} from '@/lib/env/server';
import {recordOperationalFailure} from '@/operations/errors';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 2048;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}

function bearerSecret(request: Request) {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }
  return request.headers.get('x-worker-secret')?.trim() ?? null;
}

function parseBatchSize(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

async function readBatchSize(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return {status: 'too_large' as const};
  }
  if (!contentLength || Number(contentLength) === 0) {
    return {status: 'ok' as const, batchSize: undefined};
  }
  const body = await request.json().catch(() => null);
  return {status: 'ok' as const, batchSize: body && typeof body === 'object' ? parseBatchSize((body as {batchSize?: unknown}).batchSize) : undefined};
}

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.transactionalEmailWorkerSecret || bearerSecret(request) !== env.transactionalEmailWorkerSecret) {
    return json(401, {status: 'unauthorized'});
  }

  const parsed = await readBatchSize(request);
  if (parsed.status === 'too_large') {
    return json(413, {status: 'rejected', code: 'email_worker_body_too_large'});
  }
  if (env.transactionalEmail.status !== 'configured') {
    return json(503, {status: 'unconfigured', code: env.transactionalEmail.code});
  }
  if (!env.transactionalEmail.resendApiKey) {
    return json(503, {status: 'unconfigured', code: 'missing_transactional_email_config'});
  }

  const {createProductionEmailOutboxRepository, createResendTransactionalEmailSender} = await import('@/fulfillment/email-outbox.server');
  const result = await processTransactionalEmailBatch({
    repository: createProductionEmailOutboxRepository(),
    sender: createResendTransactionalEmailSender(env.transactionalEmail.resendApiKey),
    config: {
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      fromEmail: env.transactionalEmail.fromEmail,
      batchSize: parsed.batchSize
    },
    operationalFailureRecorder: recordOperationalFailure
  });

  return json(200, result);
}

export async function GET() {
  return json(405, {status: 'method_not_allowed'});
}
