import { NextResponse, type NextRequest } from 'next/server';
import { getWishlistedProductIds } from '@/account/wishlist';
import { parseWishlistProductIds } from '@/account/wishlist-client-state';
import { getRequestUser } from '@/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  const client = await createSupabaseServerClient();
  const selected = await getWishlistedProductIds({
    userId: user.id,
    productIds,
    client: client as never
  });
  return NextResponse.json(
    { productIds: [...selected] },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
