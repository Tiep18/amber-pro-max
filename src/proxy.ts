import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {isLocale, preferredLocale, routing} from './i18n/routing';
import {updateSession} from './lib/supabase/proxy';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_FILE = /\.(.*)$/;
const PHYSICAL_AUTH_SLUGS = new Set([
  '/vi/dang-nhap',
  '/vi/dang-ky',
  '/vi/quen-mat-khau',
  '/vi/dat-lai-mat-khau',
  '/en/sign-in',
  '/en/register',
  '/en/forgot-password',
  '/en/reset-password'
]);
const PHYSICAL_PROTECTED_SLUGS = new Set(['/vi/tai-khoan', '/en/account']);

function isUnprefixedCustomerPath(pathname: string) {
  const firstSegment = pathname.split('/')[1];
  return (
    !isLocale(firstSegment) &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/admin') &&
    !PUBLIC_FILE.test(pathname)
  );
}

export default async function proxy(request: NextRequest) {
  const {pathname, search} = request.nextUrl;

  if (PHYSICAL_AUTH_SLUGS.has(pathname) || PHYSICAL_PROTECTED_SLUGS.has(pathname)) {
    return updateSession(request, NextResponse.next());
  }

  if (pathname.startsWith('/admin')) {
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
    return updateSession(request, NextResponse.redirect(url));
  }

  return updateSession(request, intlMiddleware(request));
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
