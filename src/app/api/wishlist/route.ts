import { NextResponse, type NextRequest } from 'next/server';
import { getCustomerWishlist } from '@/account/wishlist';
import { parseWishlistProductIds } from '@/account/wishlist-client-state';
import { getRequestMarket } from '@/catalog/page-context';
import { getRequestUser } from '@/auth/request-user';
import { routing, type Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function requestLocale(request: NextRequest): Locale {
  const value = request.nextUrl.searchParams.get('locale');
  return routing.locales.includes(value as Locale) ? (value as Locale) : 'en';
}

export async function GET(request: NextRequest) {
  const productIds = parseWishlistProductIds(request.nextUrl.searchParams.get('productIds'));
  if (productIds.length === 0) {
    return NextResponse.json(
      { productIds: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json(
      { productIds: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  // Reuse the same authenticated wishlist RPC path as the account page so
  // public ISR surfaces get consistent personalized state after hydration.
  const [market, client] = await Promise.all([getRequestMarket(), createSupabaseServerClient()]);
  const result = await getCustomerWishlist({
    userId: user.id,
    locale: requestLocale(request),
    market,
    client: client as never
  });
  const requested = new Set(productIds);
  const selected =
    result.status === 'success'
      ? result.items.flatMap((item) => (requested.has(item.productId) ? [item.productId] : []))
      : [];
  return NextResponse.json(
    { productIds: selected },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
