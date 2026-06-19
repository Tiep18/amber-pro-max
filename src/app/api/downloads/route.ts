import {NextRequest, NextResponse} from 'next/server';
import {authorizeDownloadWithSupabase} from '@/fulfillment/downloads.server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';

export const dynamic = 'force-dynamic';

function genericDenied() {
  return NextResponse.json({status: 'not_found'}, {status: 404});
}

async function currentUserId() {
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function handleDownload(request: NextRequest) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get('orderNumber') ?? '';
  const rawGuestToken = url.searchParams.get('token');
  const cookieHash = orderNumber ? await getGuestOrderAccessHashFromServer(orderNumber) : null;
  const userId = await currentUserId();

  const result = await authorizeDownloadWithSupabase({
    orderNumber,
    userId,
    rawGuestToken: rawGuestToken ?? null,
    guestTokenHash: cookieHash
  });

  if (result.status !== 'authorized') {
    return genericDenied();
  }

  return NextResponse.redirect(result.url, {status: 303});
}

export async function GET(request: NextRequest) {
  return handleDownload(request);
}

export async function POST(request: NextRequest) {
  return handleDownload(request);
}

