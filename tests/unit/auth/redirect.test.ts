import {describe, expect, it} from 'vitest';
import {safeRedirect} from '@/auth/redirect';

describe('safeRedirect', () => {
  it('falls back to the localized home page when next is missing', () => {
    expect(safeRedirect(null, 'vi')).toBe('/vi');
    expect(safeRedirect(undefined, 'en')).toBe('/en');
  });

  it.each([
    'https://example.com/en',
    'http://localhost:3000/en',
    '//example.com/en',
    'javascript:alert(1)',
    '::::',
    '/admin',
    '/fr/sign-in',
    '/sign-in',
    '/en/unknown'
  ])('rejects unsafe next value %s', (next) => {
    expect(safeRedirect(next, 'en')).toBe('/en');
  });

  it.each([
    ['/vi', '/vi'],
    ['/en', '/en'],
    ['/vi/dang-nhap', '/vi/dang-nhap'],
    ['/en/sign-in', '/en/sign-in'],
    ['/vi/dang-ky', '/vi/dang-ky'],
    ['/en/register', '/en/register'],
    ['/vi/quen-mat-khau', '/vi/quen-mat-khau'],
    ['/en/forgot-password', '/en/forgot-password'],
    ['/vi/dat-lai-mat-khau', '/vi/dat-lai-mat-khau'],
    ['/en/reset-password', '/en/reset-password'],
    ['/vi/tai-khoan', '/vi/tai-khoan'],
    ['/en/account', '/en/account']
  ])('allows known localized route %s', (next, expected) => {
    expect(safeRedirect(next, 'vi')).toBe(expected);
  });

  it('normalizes trailing slash and preserves safe query strings', () => {
    expect(safeRedirect('/en/sign-in/?next=/en/account', 'en')).toBe('/en/sign-in?next=%2Fen%2Faccount');
  });

  it('drops unsafe nested next query values', () => {
    expect(safeRedirect('/en/sign-in?next=https://evil.example', 'en')).toBe('/en/sign-in');
  });
});
