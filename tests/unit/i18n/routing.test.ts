import { describe, expect, it } from 'vitest';
import en from '../../../src/messages/en.json';
import vi from '../../../src/messages/vi.json';
import * as routingModule from '../../../src/i18n/routing';

const { getEquivalentLocalizedPath, getLocalizedPath, pathnames, preferredLocale, routing } =
  routingModule;

type FutureRoutingModule = typeof routingModule & {
  allowlistedRouteQuery?: (kind: 'catalog' | 'auth' | 'other', query: URLSearchParams) => string;
  getEquivalentLocalizedPath: (
    currentPath: string,
    targetLocale: 'vi' | 'en',
    localizedSlugs?: { vi: string; en: string }
  ) => `/${'vi' | 'en'}${string}`;
};

const futureRouting = routingModule as FutureRoutingModule;

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

  it('maps equivalent static internal routes to each localized external path', () => {
    expect(getEquivalentLocalizedPath('/vi/dang-nhap', 'en')).toBe('/en/sign-in');
    expect(getEquivalentLocalizedPath('/en/sign-in', 'vi')).toBe('/vi/dang-nhap');
    expect(getEquivalentLocalizedPath('/vi/tai-khoan', 'en')).toBe('/en/account');
    expect(getLocalizedPath('/account/orders', 'vi')).toBe('/vi/tai-khoan/don-hang');
    expect(getLocalizedPath('/account/orders', 'en')).toBe('/en/account/orders');
    expect(getLocalizedPath('/account/patterns', 'vi')).toBe('/vi/tai-khoan/mau-pdf');
    expect(getLocalizedPath('/account/patterns', 'en')).toBe('/en/account/patterns');
  });

  it.each([
    ['vi-VN,vi;q=0.9,en;q=0.8', 'vi'],
    ['en-US,en;q=0.9', 'en']
  ] as const)('uses the best supported Accept-Language locale for %s', (header, expected) => {
    expect(preferredLocale(header)).toBe(expected);
  });

  it.fails('Plan 09-04: honors weighted Accept-Language quality before language order', () => {
    expect(preferredLocale('vi;q=0.2,en-US;q=0.9')).toBe('en');
  });

  it.fails('Plan 09-04: falls back to vi when Accept-Language is absent or unsupported', () => {
    expect(preferredLocale(null)).toBe('vi');
    expect(preferredLocale('fr-FR,fr;q=0.9')).toBe('vi');
  });

  it.fails(
    'Plan 09-04: maps product, category, and collection paths using supplied localized slugs',
    () => {
      const cases = [
        ['/vi/san-pham/gau-len', '/en/product/crochet-bear'],
        ['/vi/danh-muc/thu-bong', '/en/category/stuffed-animals'],
        ['/vi/bo-suu-tap/giang-sinh', '/en/collection/christmas']
      ] as const;

      for (const [currentPath, expected] of cases) {
        const [viSlug, enSlug] = currentPath.includes('gau-len')
          ? ['gau-len', 'crochet-bear']
          : currentPath.includes('thu-bong')
            ? ['thu-bong', 'stuffed-animals']
            : ['giang-sinh', 'christmas'];
        expect(
          futureRouting.getEquivalentLocalizedPath(currentPath, 'en', { vi: viSlug, en: enSlug })
        ).toBe(expected);
      }
    }
  );

  it.fails('Plan 09-04: supports future technique and tag equivalent route kinds', () => {
    expect(
      futureRouting.getEquivalentLocalizedPath('/vi/ky-thuat/moc', 'en', {
        vi: 'moc',
        en: 'crochet'
      })
    ).toBe('/en/technique/crochet');
    expect(
      futureRouting.getEquivalentLocalizedPath('/en/tag/holiday', 'vi', {
        vi: 'ngay-le',
        en: 'holiday'
      })
    ).toBe('/vi/the/ngay-le');
  });

  it.fails('Plan 09-04: preserves only the catalog query allowlist', () => {
    const query = new URLSearchParams([
      ['search', 'bear'],
      ['type', 'physical'],
      ['category', 'animals'],
      ['technique', 'crochet'],
      ['tag', 'gift'],
      ['sort', 'price-asc'],
      ['next', '/en/account'],
      ['debug', '1']
    ]);

    expect(futureRouting.allowlistedRouteQuery?.('catalog', query)).toBe(
      '?search=bear&type=physical&category=animals&technique=crochet&tag=gift&sort=price-asc'
    );
  });

  it.fails('Plan 09-04: preserves only one validated internal auth next path', () => {
    const allow = futureRouting.allowlistedRouteQuery;
    expect(allow?.('auth', new URLSearchParams('next=%2Fen%2Fcheckout'))).toBe(
      '?next=%2Fen%2Fcheckout'
    );

    for (const unsafe of [
      'next=https%3A%2F%2Fevil.example',
      'next=%2F%2Fevil.example',
      'next=%2Fen%5Ccheckout',
      'next=%2Fen%2Fsign-in%3Fnext%3D%2Fen%2Fcheckout',
      'next=%2Fen%2Fcart&next=%2Fen%2Faccount'
    ]) {
      expect(allow?.('auth', new URLSearchParams(unsafe))).toBe('');
    }
    expect(allow?.('other', new URLSearchParams('next=%2Fen%2Fcheckout'))).toBe('');
  });

  it('keeps message key coverage equal across locales', () => {
    expect(flattenKeys(vi).sort()).toEqual(flattenKeys(en).sort());
  });
});
