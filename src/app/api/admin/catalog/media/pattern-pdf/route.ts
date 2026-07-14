import {NextRequest, NextResponse} from 'next/server';
import {requireAdmin} from '@/auth/guards';
import {uploadPatternPdfAction} from '@/catalog/media-actions';
import {MAX_PATTERN_PDF_BYTES} from '@/catalog/media-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = MAX_PATTERN_PDF_BYTES + 2 * 1024 * 1024;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return origin === null || origin === request.nextUrl.origin;
}

function bodyTooLarge(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  return Boolean(contentLength && Number(contentLength) > MAX_REQUEST_BYTES);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return json(403, {status: 'invalid', code: 'invalid_input'});
  }
  if (bodyTooLarge(request)) {
    return json(413, {status: 'invalid', code: 'invalid_file'});
  }

  await requireAdmin();

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return json(400, {status: 'invalid', code: 'invalid_input'});
  }

  const result = await uploadPatternPdfAction(formData);
  return json(result.status === 'success' ? 200 : result.status === 'invalid' ? 400 : 500, result);
}

