import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {applyMarketSuggestionCookie} from './catalog/market';
import {isLocale, preferredLocale, routing} from './i18n/routing';
import {updateSession} from './lib/supabase/proxy';
import {isUnprefixedCustomerPath} from './proxy-paths';

const intlMiddleware = createMiddleware(routing);

const viRoutedAliases: RegExp[] = [
  /^\/vi\/cua-hang(?=\/|$)/,
  /^\/vi\/danh-muc(?=\/|$)/,
  /^\/vi\/bo-suu-tap(?=\/|$)/,
  /^\/vi\/san-pham(?=\/|$)/,
  /^\/vi\/bai-viet(?=\/|$)/
];

function isVietnameseRoutedAlias(pathname: string) {
  return viRoutedAliases.some((pattern) => pattern.test(pathname));
}

export default async function proxy(request: NextRequest) {
  const {pathname, search} = request.nextUrl;

  if (pathname.startsWith('/sitemaps') || pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
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

  if (isVietnameseRoutedAlias(pathname)) {
    return updateSession(request, applyMarketSuggestionCookie(request, NextResponse.next()));
  }

  return updateSession(request, applyMarketSuggestionCookie(request, intlMiddleware(request)));
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
