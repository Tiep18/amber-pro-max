import type {NextRequest, NextResponse} from 'next/server';
import {isLocale, type Locale} from '@/i18n/routing';

export const MARKET_COOKIE = 'ACTIVE_MARKET';
export const MARKET_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type MarketCode = 'vn' | 'intl';

type ResolveMarketInput = {
  cookieMarket?: string | null;
  country?: string | null;
};

export function isMarketCode(value: unknown): value is MarketCode {
  return value === 'vn' || value === 'intl';
}

export function suggestMarketFromCountry(country: string | null | undefined): MarketCode {
  return country?.toUpperCase() === 'VN' ? 'vn' : 'intl';
}

export function resolveActiveMarket({cookieMarket, country}: ResolveMarketInput): MarketCode {
  return isMarketCode(cookieMarket) ? cookieMarket : suggestMarketFromCountry(country);
}

export function marketCookieOptions() {
  return {
    httpOnly: true,
    maxAge: MARKET_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production'
  };
}

export function safeMarketReturnPath(value: FormDataEntryValue | string | null | undefined, fallbackLocale: Locale = 'vi') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return `/${fallbackLocale}` as `/${Locale}${string}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://local.invalid');
  } catch {
    return `/${fallbackLocale}` as `/${Locale}${string}`;
  }

  if (parsed.origin !== 'https://local.invalid') {
    return `/${fallbackLocale}` as `/${Locale}${string}`;
  }

  const [, routeLocale] = parsed.pathname.split('/');
  if (!isLocale(routeLocale)) {
    return `/${fallbackLocale}` as `/${Locale}${string}`;
  }

  const normalizedPath = parsed.pathname.replace(/\/$/, '') || `/${routeLocale}`;
  return normalizedPath as `/${Locale}${string}`;
}

export function applyMarketSuggestionCookie(request: NextRequest, response: NextResponse) {
  const activeMarket = resolveActiveMarket({
    cookieMarket: request.cookies.get(MARKET_COOKIE)?.value,
    country: request.headers.get('x-vercel-ip-country')
  });

  if (request.cookies.get(MARKET_COOKIE)?.value !== activeMarket) {
    response.cookies.set(MARKET_COOKIE, activeMarket, marketCookieOptions());
  }

  return response;
}
