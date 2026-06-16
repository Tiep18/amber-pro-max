import {describe, expect, test, vi} from 'vitest';
import {
  buildGuestOrderCookieName,
  getGuestOrderAccessHash,
  hashGuestOrderAccessToken,
  setGuestOrderAccessCookie
} from '@/payments/guest-access';

describe('guest order access', () => {
  test('hashes raw guest order tokens with sha256 before lookup', () => {
    expect(hashGuestOrderAccessToken('raw-guest-token')).toBe(
      '5b09b3bd2cc307168ebae2cebd35bef0b93738b0cd8635c4d269895e2fcc793f'
    );
  });

  test('uses an order-scoped HttpOnly cookie and never returns the raw token from reads', () => {
    const set = vi.fn();
    const get = vi.fn().mockReturnValue({value: 'raw-guest-token'});
    const cookieStore = {set, get};

    const result = setGuestOrderAccessCookie({
      cookieStore,
      orderNumber: 'ATB-20260616-0001',
      rawToken: 'raw-guest-token',
      reservationExpiresAt: '2026-06-16T12:00:00.000Z',
      production: true
    });

    expect(result).toEqual({status: 'set', cookieName: buildGuestOrderCookieName('ATB-20260616-0001')});
    expect(set).toHaveBeenCalledWith(
      'atb_guest_order_ATB-20260616-0001',
      'raw-guest-token',
      expect.objectContaining({httpOnly: true, sameSite: 'lax', secure: true, path: '/'})
    );
    expect(getGuestOrderAccessHash({cookieStore, orderNumber: 'ATB-20260616-0001'})).toBe(
      '5b09b3bd2cc307168ebae2cebd35bef0b93738b0cd8635c4d269895e2fcc793f'
    );
  });
});
