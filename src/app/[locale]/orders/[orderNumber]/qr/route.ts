import {NextResponse} from 'next/server';
import {z} from 'zod';
import {locales} from '@/i18n/routing';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {getAuthorizedOrderPayment} from '@/payments/queries';
import {
  buildQuickLinkUrl,
  buildVietQrDownloadFilename
} from '@/payments/vietqr/instructions';

export const dynamic = 'force-dynamic';

const routeParamsSchema = z.object({
  locale: z.enum(locales),
  orderNumber: z.string().trim().min(1).max(80).regex(/^[\x20-\x7E]+$/)
}).strict();

const MAX_QR_BYTES = 1 * 1024 * 1024;
const QR_FETCH_TIMEOUT_MS = 8_000;
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff'
} as const;

function genericDenied() {
  return NextResponse.json(
    {status: 'not_found'},
    {status: 404, headers: PRIVATE_HEADERS}
  );
}

function genericUpstreamFailure() {
  return NextResponse.json(
    {status: 'unavailable'},
    {status: 502, headers: PRIVATE_HEADERS}
  );
}

function isAllowedVietQrImageUrl(url: URL) {
  return (
    url.protocol === 'https:' &&
    url.hostname === 'img.vietqr.io' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname.startsWith('/image/') &&
    url.pathname.endsWith('.png')
  );
}

async function readBoundedQrBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) {
    return null;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > MAX_QR_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function GET(
  _request: Request,
  {params}: {params: Promise<{locale: string; orderNumber: string}>}
) {
  const parsed = routeParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return genericDenied();
  }

  const {orderNumber} = parsed.data;
  const client = await createSupabaseServerClient();
  const [{data: authData}, guestSecretHash] = await Promise.all([
    client.auth.getUser(),
    getGuestOrderAccessHashFromServer(orderNumber)
  ]);
  if (!authData.user && !guestSecretHash) {
    return genericDenied();
  }

  const authorized = await getAuthorizedOrderPayment({
    orderNumber,
    guestSecretHash,
    client: client as never
  });
  if (authorized.status !== 'found') {
    return genericDenied();
  }

  const {order} = authorized;
  if (
    order.market !== 'vn' ||
    order.currencyCode !== 'VND' ||
    order.paymentIntent !== 'vietqr_intent' ||
    order.provider !== 'vietqr' ||
    order.paymentStatus !== 'pending' ||
    !Number.isInteger(order.amountMinor) ||
    order.amountMinor <= 0
  ) {
    return genericDenied();
  }

  const env = getServerEnv();
  if (
    env.vietqr.status !== 'configured' ||
    !env.vietqr.bankId ||
    !env.vietqr.accountNo ||
    !env.vietqr.accountName
  ) {
    return genericUpstreamFailure();
  }

  const upstreamUrl = new URL(
    buildQuickLinkUrl(
      {
        status: 'configured',
        bankId: env.vietqr.bankId,
        accountNo: env.vietqr.accountNo,
        accountName: env.vietqr.accountName,
        template: env.vietqr.template
      },
      order.amountMinor,
      order.orderNumber
    )
  );
  if (!isAllowedVietQrImageUrl(upstreamUrl)) {
    return genericUpstreamFailure();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QR_FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal
    });
    const contentLength = Number.parseInt(upstream.headers.get('content-length') ?? '', 10);
    const contentType = upstream.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (
      !upstream.ok ||
      contentType !== 'image/png' ||
      (Number.isFinite(contentLength) && contentLength > MAX_QR_BYTES)
    ) {
      return genericUpstreamFailure();
    }

    const body = await readBoundedQrBody(upstream.body);
    if (!body || body.byteLength === 0) {
      return genericUpstreamFailure();
    }

    const filename = buildVietQrDownloadFilename(orderNumber);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...PRIVATE_HEADERS
      }
    });
  } catch {
    return genericUpstreamFailure();
  } finally {
    clearTimeout(timeout);
  }
}
