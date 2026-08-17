import {NextRequest, NextResponse} from 'next/server';
import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';
import {authorizeDownloadWithSupabase} from '@/fulfillment/downloads.server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';

export const dynamic = 'force-dynamic';

function genericDenied() {
  return NextResponse.json({status: 'not_found'}, {status: 404});
}

function safeLogReference(value: string | null) {
  return value && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null;
}

async function currentUserId() {
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function handleDownload(request: NextRequest) {
  let orderNumber = '';
  let productId: string | null = null;
  try {
    const url = new URL(request.url);
    orderNumber = url.searchParams.get('orderNumber') ?? '';
    productId = url.searchParams.get('productId');
    const rawDownloadToken = url.searchParams.get('token');
    const downloadTokenHash =
      rawDownloadToken && rawDownloadToken.length <= 512
        ? hashFulfillmentAccessToken(rawDownloadToken)
        : null;
    const cookieHash = orderNumber ? await getGuestOrderAccessHashFromServer(orderNumber) : null;
    const ownerUserId = await currentUserId();

    const result = await authorizeDownloadWithSupabase({
      orderNumber,
      productId,
      ownerUserId,
      downloadTokenHash,
      guestSecretHash: cookieHash
    });

    if (result.status !== 'authorized') {
      return genericDenied();
    }

    return NextResponse.redirect(result.url, {status: 303});
  } catch {
    console.error('Download authorization failed', {
      orderNumber: safeLogReference(orderNumber),
      productId: safeLogReference(productId)
    });
    return genericDenied();
  }
}

export async function GET(request: NextRequest) {
  return handleDownload(request);
}

export async function POST(request: NextRequest) {
  return handleDownload(request);
}

