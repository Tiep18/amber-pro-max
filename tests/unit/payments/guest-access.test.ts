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
      '6378ef312cb11ebcb49e6c136843081ee5e61d6f2b9b0336e357127a75cc1068'
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
      '6378ef312cb11ebcb49e6c136843081ee5e61d6f2b9b0336e357127a75cc1068'
    );
  });
});
