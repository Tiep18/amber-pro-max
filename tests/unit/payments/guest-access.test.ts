import {describe, expect, test, vi} from 'vitest';
import {
  acknowledgeGuestCheckoutRecovery,
  buildGuestOrderCookieName,
  getGuestCheckoutRecovery,
  getGuestOrderAccessHash,
  hashGuestOrderAccessToken,
  prepareGuestCheckoutRecovery,
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

describe('guest checkout recovery', () => {
  test('prepares independent 256-bit credentials in an HttpOnly cookie and reuses a matching intent', () => {
    const values = new Map<string, string>();
    const set = vi.fn((name: string, value: string) => values.set(name, value));
    const cookieStore = {get: (name: string) => values.has(name) ? {value: values.get(name)!} : undefined, set, delete: vi.fn()};

    expect(prepareGuestCheckoutRecovery({cookieStore, intent: 'quote-a', production: true, now: 1_000})).toEqual({status: 'ready'});
    const prepared = getGuestCheckoutRecovery({cookieStore, intent: 'quote-a', now: 1_001});
    expect(prepared?.attemptId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prepared?.proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prepared?.attemptId).not.toBe(prepared?.proof);
    expect(set).toHaveBeenCalledWith(
      'atb_guest_checkout_recovery',
      expect.any(String),
      expect.objectContaining({httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 1800})
    );

    prepareGuestCheckoutRecovery({cookieStore, intent: 'quote-a', production: true, now: 1_002});
    expect(set).toHaveBeenCalledTimes(1);
  });

  test('rotates malformed or differently-bound recovery cookies', () => {
    const values = new Map([['atb_guest_checkout_recovery', 'malformed']]);
    const set = vi.fn((name: string, value: string) => values.set(name, value));
    const cookieStore = {get: (name: string) => values.has(name) ? {value: values.get(name)!} : undefined, set, delete: vi.fn()};

    prepareGuestCheckoutRecovery({cookieStore, intent: 'quote-a', now: 1_000});
    const first = values.get('atb_guest_checkout_recovery');
    prepareGuestCheckoutRecovery({cookieStore, intent: 'quote-b', now: 1_001});
    expect(values.get('atb_guest_checkout_recovery')).not.toBe(first);
  });

  test('acknowledges only when the order cookie proves the same secret', () => {
    const values = new Map<string, string>();
    const cookieStore = {
      get: (name: string) => values.has(name) ? {value: values.get(name)!} : undefined,
      set: (name: string, value: string) => values.set(name, value),
      delete: vi.fn((name: string) => values.delete(name))
    };
    prepareGuestCheckoutRecovery({cookieStore, intent: 'quote-a', now: 1_000});
    const recovery = getGuestCheckoutRecovery({cookieStore, intent: 'quote-a', now: 1_001})!;
    values.set(buildGuestOrderCookieName('ATB-1'), 'wrong-proof');
    expect(acknowledgeGuestCheckoutRecovery({cookieStore, orderNumber: 'ATB-1', recovery})).toEqual({status: 'kept'});
    values.set(buildGuestOrderCookieName('ATB-1'), recovery.proof);
    expect(acknowledgeGuestCheckoutRecovery({cookieStore, orderNumber: 'ATB-1', recovery})).toEqual({status: 'cleared'});
    expect(cookieStore.delete).toHaveBeenCalledWith('atb_guest_checkout_recovery');
  });
});
