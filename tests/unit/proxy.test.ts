import {NextRequest} from 'next/server';
import {describe, expect, it, vi} from 'vitest';
import {isUnprefixedCustomerPath} from '@/proxy-paths';

const {applyMarketSuggestionCookie, intlMiddleware, updateSession} = vi.hoisted(() => ({
  applyMarketSuggestionCookie: vi.fn((_request: NextRequest, response: Response) => {
    response.headers.set('x-market-applied', '1');
    return response;
  }),
  intlMiddleware: vi.fn((request: NextRequest) =>
    request.nextUrl.pathname === '/'
      ? Response.redirect(new URL('/from-next-intl', request.url), 307)
      : new Response(null, {status: 200})
  ),
  updateSession: vi.fn(async (_request: NextRequest, response: Response) => {
    response.headers.set('x-session-refreshed', '1');
    return response;
  })
}));

vi.mock('next-intl/middleware', () => ({default: vi.fn(() => intlMiddleware)}));
vi.mock('@/catalog/market', () => ({applyMarketSuggestionCookie}));
vi.mock('@/lib/supabase/proxy', () => ({updateSession}));

import proxy from '@/proxy';

function request(pathname: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://store.example${pathname}`, {headers});
}

describe('proxy route classification', () => {
  it('does not locale-prefix system auth callback routes', () => {
    expect(isUnprefixedCustomerPath('/auth/callback')).toBe(false);
  });

  it('still locale-prefixes unprefixed customer routes', () => {
    expect(isUnprefixedCustomerPath('/reset-password')).toBe(true);
    expect(isUnprefixedCustomerPath('/')).toBe(true);
  });

  it('delegates unprefixed locale resolution to next-intl', async () => {
    const incoming = request('/', {
      cookie: 'NEXT_LOCALE=vi',
      'accept-language': 'en-US,en;q=0.9'
    });
    const response = await proxy(incoming);

    expect(intlMiddleware).toHaveBeenCalledWith(incoming);
    expect(response.headers.get('location')).toBe('https://store.example/from-next-intl');
    expect(response.headers.get('x-market-applied')).toBe('1');
    expect(response.headers.get('x-session-refreshed')).toBe('1');
  });

  it('composes localized auth, market suggestion, and session refresh on one response', async () => {
    const incoming = request('/vi/dang-nhap', {'x-vercel-ip-country': 'VN'});
    const response = await proxy(incoming);

    expect(intlMiddleware).toHaveBeenCalledWith(incoming);
    expect(applyMarketSuggestionCookie).toHaveBeenCalledWith(incoming, response);
    expect(response.headers.get('x-market-applied')).toBe('1');
    expect(response.headers.get('x-session-refreshed')).toBe('1');
  });
});
