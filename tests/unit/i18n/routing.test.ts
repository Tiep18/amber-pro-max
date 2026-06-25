import {describe, expect, it} from 'vitest';
import en from '../../../src/messages/en.json';
import vi from '../../../src/messages/vi.json';
import {
  getEquivalentLocalizedPath,
  getLocalizedPath,
  pathnames,
  preferredLocale,
  routing
} from '../../../src/i18n/routing';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [prefix];
}

describe('localized routing contract', () => {
  it('uses only explicit Vietnamese and English locale prefixes', () => {
    expect(routing.locales).toEqual(['vi', 'en']);
    expect(routing.localePrefix).toBe('always');
    expect(getLocalizedPath('/', 'vi')).toBe('/vi');
    expect(getLocalizedPath('/', 'en')).toBe('/en');
  });

  it('includes translated public auth slugs', () => {
    expect(pathnames['/sign-in']).toEqual({
      vi: '/dang-nhap',
      en: '/sign-in'
    });
    expect(getLocalizedPath('/sign-in', 'vi')).toBe('/vi/dang-nhap');
    expect(getLocalizedPath('/sign-in', 'en')).toBe('/en/sign-in');
  });

  it('maps equivalent internal routes to each localized external path', () => {
    expect(getEquivalentLocalizedPath('/vi/dang-nhap', 'en')).toBe('/en/sign-in');
    expect(getEquivalentLocalizedPath('/en/sign-in', 'vi')).toBe('/vi/dang-nhap');
    expect(getEquivalentLocalizedPath('/vi/tai-khoan', 'en')).toBe('/en/account');
    expect(getLocalizedPath('/account/orders', 'vi')).toBe('/vi/tai-khoan/don-hang');
    expect(getLocalizedPath('/account/orders', 'en')).toBe('/en/account/orders');
    expect(getLocalizedPath('/account/patterns', 'vi')).toBe('/vi/tai-khoan/mau-pdf');
    expect(getLocalizedPath('/account/patterns', 'en')).toBe('/en/account/patterns');
  });

  it('chooses Vietnamese only when Vietnamese is preferred', () => {
    expect(preferredLocale('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
    expect(preferredLocale('en-US,en;q=0.9')).toBe('en');
    expect(preferredLocale('fr-FR,fr;q=0.9')).toBe('en');
  });

  it('keeps message key coverage equal across locales', () => {
    expect(flattenKeys(vi).sort()).toEqual(flattenKeys(en).sort());
  });
});
