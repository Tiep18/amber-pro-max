import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {applyMarketSuggestionCookie} from './catalog/market';
import {isLocale, preferredLocale, routing} from './i18n/routing';
import {updateSession} from './lib/supabase/proxy';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_FILE = /\.(.*)$/;

function isUnprefixedCustomerPath(pathname: string) {
  const firstSegment = pathname.split('/')[1];
  return (
    !isLocale(firstSegment) &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/sitemaps') &&
    !PUBLIC_FILE.test(pathname)
  );
}

export default async function proxy(request: NextRequest) {
  const {pathname, search} = request.nextUrl;

  if (pathname.startsWith('/sitemaps') || pathname.startsWith('/admin')) {
    return updateSession(request, NextResponse.next());
  }

  if (isUnprefixedCustomerPath(pathname)) {
    const savedLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = isLocale(savedLocale)
      ? savedLocale
      : preferredLocale(request.headers.get('accept-language'));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    url.search = search;
    return updateSession(request, applyMarketSuggestionCookie(request, NextResponse.redirect(url)));
  }

  return updateSession(request, applyMarketSuggestionCookie(request, intlMiddleware(request)));
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
