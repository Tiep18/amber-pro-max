import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {redeemGuestOrderReopenToken} from '@/fulfillment/order-reopen';
import {defaultLocale, getGuestOrderPath, getOrderPath, isLocale, type Locale} from '@/i18n/routing';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {setGuestOrderAccessCookieFromServer} from '@/payments/guest-access';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  token: z.string().trim().min(1).max(512)
});

function deniedRedirect(request: NextRequest, locale: Locale) {
  const url = new URL(getGuestOrderPath(locale), request.url);
  url.searchParams.set('state', 'link_expired');
  const response = NextResponse.redirect(url, {status: 303});
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale') ?? undefined;
  const locale: Locale = isLocale(localeParam) ? localeParam : defaultLocale;

  const parsed = querySchema.safeParse({
    orderNumber: url.searchParams.get('orderNumber') ?? '',
    token: url.searchParams.get('token') ?? ''
  });
  if (!parsed.success) {
    return deniedRedirect(request, locale);
  }

  // Any unhandled throw here would leave the browser sitting on this URL —
  // which carries the raw token in its query string, and therefore in history
  // and in any error reporting. Always leave via a redirect instead.
  try {
    const client = createSupabaseAdminClient() as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
    };
    const result = await redeemGuestOrderReopenToken(
      {orderNumber: parsed.data.orderNumber, rawToken: parsed.data.token},
      client
    );
    if (result.status !== 'granted') {
      return deniedRedirect(request, locale);
    }

    await setGuestOrderAccessCookieFromServer({
      orderNumber: result.orderNumber,
      rawToken: result.rawSecret,
      reservationExpiresAt: result.reservationExpiresAt,
      paid: result.paid
    });

    const target = new URL(getOrderPath(locale, result.orderNumber), request.url);
    const response = NextResponse.redirect(target, {status: 303});
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch {
    return deniedRedirect(request, locale);
  }
}
