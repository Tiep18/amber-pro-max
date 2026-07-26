'use server';

import { cookies } from 'next/headers';
import { MARKET_COOKIE, isMarketCode, marketCookieOptions } from './market';

export type MarketMutationResult =
  | { status: 'success'; market: 'vn' | 'intl' }
  | { status: 'error'; code: 'invalid_market' | 'mutation_failed' };

function marketFromInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const market = (input as { market?: unknown }).market;
  return isMarketCode(market) ? market : null;
}

export async function commitActiveMarketAction(input: unknown): Promise<MarketMutationResult> {
  const market = marketFromInput(input);
  if (!market) {
    return { status: 'error', code: 'invalid_market' };
  }

  try {
    const cookieStore = await cookies();
    await cookieStore.set(MARKET_COOKIE, market, marketCookieOptions());
    return { status: 'success', market };
  } catch {
    return { status: 'error', code: 'mutation_failed' };
  }
}
