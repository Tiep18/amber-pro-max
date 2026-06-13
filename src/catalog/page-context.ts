import {cookies, headers} from 'next/headers';
import {MARKET_COOKIE, resolveActiveMarket} from './market';

export async function getRequestMarket() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveActiveMarket({
    cookieMarket: cookieStore.get(MARKET_COOKIE)?.value,
    country: headerStore.get('x-vercel-ip-country')
  });
}
