import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookies, getRequestHeaderUser, getRequestMarket } = vi.hoisted(() => ({
  cookies: vi.fn(),
  getRequestHeaderUser: vi.fn(),
  getRequestMarket: vi.fn()
}));

vi.mock('next/headers', () => ({ cookies }));
vi.mock('@/auth/request-user', () => ({ getRequestHeaderUser }));
vi.mock('@/catalog/page-context', () => ({ getRequestMarket }));

import * as marketActions from '@/catalog/market-actions';
import { GET as getStorefrontContext } from '@/app/api/storefront-context/route';
import {
  MARKET_COOKIE,
  resolveActiveMarket,
  safeMarketReturnPath,
  suggestMarketFromCountry
} from '@/catalog/market';

type MarketMutationResult =
  | { status: 'success'; market: 'vn' | 'intl' }
  | { status: 'error'; code: 'invalid_market' | 'mutation_failed' };

type FutureMarketActions = typeof marketActions & {
  commitActiveMarketAction?: (input: unknown) => Promise<MarketMutationResult>;
};

const futureMarketActions = marketActions as FutureMarketActions;

describe('market resolution', () => {
  it.each([
    [{ cookieMarket: 'intl', country: 'VN' }, 'intl'],
    [{ cookieMarket: 'vn', country: 'US' }, 'vn'],
    [{ cookieMarket: 'vn', country: null }, 'vn']
  ] as const)(
    'uses a valid explicit market before the country suggestion: %o',
    (input, expected) => {
      expect(resolveActiveMarket(input)).toBe(expected);
    }
  );

  it.each([
    ['VN', 'vn'],
    ['vn', 'vn'],
    ['US', 'intl'],
    ['FR', 'intl'],
    [null, 'intl']
  ] as const)('maps trusted country suggestion %s to %s', (country, expected) => {
    expect(suggestMarketFromCountry(country)).toBe(expected);
  });

  it.each([
    [{ cookieMarket: 'usd', country: 'VN' }, 'vn'],
    [{ cookieMarket: '../vn', country: 'US' }, 'intl'],
    [{ cookieMarket: '', country: null }, 'intl'],
    [{ cookieMarket: null, country: 'VN' }, 'vn']
  ] as const)(
    'recovers invalid or missing cookie input from geo then intl: %o',
    (input, expected) => {
      expect(resolveActiveMarket(input)).toBe(expected);
    }
  );

  it('keeps country-derived market semantics explicitly suggestion-only', () => {
    const suggestedBrowsingMarket = suggestMarketFromCountry('VN');
    expect(suggestedBrowsingMarket).toBe('vn');
    expect(suggestedBrowsingMarket).not.toBe('checkout_authority');
  });
});

describe('safe market return paths', () => {
  it.each([
    ['/en', '/en'],
    ['/vi/cua-hang', '/vi/cua-hang'],
    ['/en/catalog?search=bear', '/en/catalog'],
    ['https://evil.example', '/vi'],
    ['//evil.example', '/vi'],
    ['/en\\checkout', '/vi'],
    ['/admin', '/vi'],
    [null, '/vi']
  ] as const)('normalizes %s to %s', (input, expected) => {
    expect(safeMarketReturnPath(input)).toBe(expected);
  });
});

describe('strict market mutation result contract', () => {
  const set = vi.fn();

  beforeEach(() => {
    set.mockReset();
    cookies.mockReset();
    getRequestHeaderUser.mockReset();
    getRequestMarket.mockReset();
    cookies.mockResolvedValue({ set });
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('commits a valid market and returns only the accepted enum', async () => {
    const result = await futureMarketActions.commitActiveMarketAction?.({ market: 'vn' });

    expect(result).toEqual({ status: 'success', market: 'vn' });
    expect(set).toHaveBeenCalledWith(MARKET_COOKIE, 'vn', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 180
    });
  });

  it('rejects invalid market input without cookie mutation or shared invalidation', async () => {
    const result = await futureMarketActions.commitActiveMarketAction?.({
      market: 'https://evil.example'
    });

    expect(result).toEqual({ status: 'error', code: 'invalid_market' });
    expect(set).not.toHaveBeenCalled();
  });

  it('returns a stable error when cookie persistence fails', async () => {
    set.mockRejectedValueOnce(new Error('raw persistence detail'));

    const result = await futureMarketActions.commitActiveMarketAction?.({ market: 'intl' });

    expect(result).toEqual({ status: 'error', code: 'mutation_failed' });
  });
});

describe('private storefront context delivery', () => {
  beforeEach(() => {
    getRequestHeaderUser.mockReset();
    getRequestMarket.mockReset();
  });

  it('returns only resolved market and the minimal user DTO as private no-store', async () => {
    getRequestMarket.mockResolvedValue('vn');
    getRequestHeaderUser.mockResolvedValue({ email: 'shopper@example.com', isAdmin: false });

    const response = await getStorefrontContext();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      market: 'vn',
      user: { email: 'shopper@example.com', isAdmin: false }
    });
  });

  it('sanitizes failures and still prevents intermediary caching', async () => {
    getRequestMarket.mockRejectedValue(new Error('raw cookie and header detail'));
    getRequestHeaderUser.mockResolvedValue(null);

    const response = await getStorefrontContext();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(body).toEqual({ status: 'error', code: 'context_unavailable' });
    expect(JSON.stringify(body)).not.toContain('raw cookie and header detail');
  });
});
