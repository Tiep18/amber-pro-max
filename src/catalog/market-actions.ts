'use server';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {MARKET_COOKIE, isMarketCode, marketCookieOptions, safeMarketReturnPath} from './market';

export async function setActiveMarketAction(formData: FormData) {
  const marketValue = formData.get('market');
  const market = isMarketCode(marketValue) ? marketValue : 'intl';
  const returnTo = safeMarketReturnPath(formData.get('returnTo'));
  const cookieStore = await cookies();

  cookieStore.set(MARKET_COOKIE, market, marketCookieOptions());
  redirect(returnTo);
}
