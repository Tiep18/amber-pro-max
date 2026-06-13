import {beforeEach, describe, expect, it, vi} from 'vitest';

const {cookies, redirect} = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  })
}));

vi.mock('next/headers', () => ({cookies}));
vi.mock('next/navigation', () => ({redirect}));

import {setActiveMarketAction} from '@/catalog/market-actions';
import {MARKET_COOKIE, resolveActiveMarket, suggestMarketFromCountry} from '@/catalog/market';

describe('market resolution', () => {
  it('uses a valid explicit market before the country suggestion', () => {
    expect(resolveActiveMarket({cookieMarket: 'intl', country: 'VN'})).toBe('intl');
    expect(resolveActiveMarket({cookieMarket: 'vn', country: 'US'})).toBe('vn');
  });

  it('suggests Vietnam only for VN and otherwise falls back to international', () => {
    expect(suggestMarketFromCountry('VN')).toBe('vn');
    expect(suggestMarketFromCountry('vn')).toBe('vn');
    expect(suggestMarketFromCountry('US')).toBe('intl');
    expect(suggestMarketFromCountry(null)).toBe('intl');
  });

  it('rejects invalid cookie values with a deterministic valid suggestion', () => {
    expect(resolveActiveMarket({cookieMarket: 'usd', country: 'VN'})).toBe('vn');
    expect(resolveActiveMarket({cookieMarket: '../vn', country: null})).toBe('intl');
  });
});

describe('market action', () => {
  const set = vi.fn();

  beforeEach(() => {
    set.mockReset();
    cookies.mockReset();
    redirect.mockClear();
    cookies.mockResolvedValue({set});
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('writes the active market cookie with safe cookie options', async () => {
    const formData = new FormData();
    formData.set('market', 'vn');
    formData.set('returnTo', '/en');

    await expect(setActiveMarketAction(formData)).rejects.toThrow('redirect:/en');

    expect(set).toHaveBeenCalledWith(MARKET_COOKIE, 'vn', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 180
    });
  });

  it('rejects invalid markets and unsafe redirects', async () => {
    const formData = new FormData();
    formData.set('market', 'https://evil.example');
    formData.set('returnTo', '//evil.example');

    await expect(setActiveMarketAction(formData)).rejects.toThrow('redirect:/vi');

    expect(set).toHaveBeenCalledWith(MARKET_COOKIE, 'intl', expect.objectContaining({httpOnly: true}));
  });
});
