import 'server-only';

import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import {reportOperationalFailure} from '@/operations/monitoring';
import {mapWishlistRows, type CustomerWishlistResult} from '@/account/wishlist';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type WishlistLookupClient = {
  from: (table: 'wishlist_items') => {
    select: (columns: 'product_id') => {
      eq: (column: 'user_id', value: string) => {
        in: (column: 'product_id', values: string[]) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function getWishlistedProductIds({
  userId,
  productIds,
  client
}: {
  userId: string | null | undefined;
  productIds: string[];
  client: WishlistLookupClient;
}) {
  const uniqueProductIds = [...new Set(productIds)].filter(Boolean);
  if (!userId || uniqueProductIds.length === 0) {
    return new Set<string>();
  }

  const {data, error} = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .in('product_id', uniqueProductIds);

  if (error || !Array.isArray(data)) {
    return new Set<string>();
  }

  return new Set(
    data.flatMap((row) => (
      isRecord(row) && typeof row.product_id === 'string' ? [row.product_id] : []
    ))
  );
}

export async function getCustomerWishlist({
  locale,
  market,
  client
}: {
  userId: string;
  locale: Locale;
  market: MarketCode;
  client: RpcClient;
}): Promise<CustomerWishlistResult> {
  const {data, error} = await client.rpc('get_customer_wishlist', {
    p_locale: locale,
    p_market: market
  });
  if (error || !Array.isArray(data)) {
    return reportOperationalFailure({
      area: 'application',
      action: 'wishlist_load',
      errorCode: 'account.wishlist.load_failed',
      summary: error ? 'Customer wishlist load failed' : 'Customer wishlist returned an unexpected result',
      errorResult: {status: 'error', code: 'wishlist_load_failed'} as const,
      facts: {
        market
      }
    });
  }
  return {status: 'success', items: mapWishlistRows(data, {locale, market})};
}
