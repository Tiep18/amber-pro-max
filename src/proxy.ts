import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {applyMarketSuggestionCookie} from './catalog/market';
import {routing} from './i18n/routing';
import {updateSession} from './lib/supabase/proxy';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (
    pathname.startsWith('/sitemaps') ||
    pathname.startsWith('/admin') ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/auth/callback/')
  ) {
    return updateSession(request, NextResponse.next());
  }

  return updateSession(request, applyMarketSuggestionCookie(request, intlMiddleware(request)));
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
