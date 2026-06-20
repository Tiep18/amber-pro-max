import {defineRouting} from 'next-intl/routing';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export const pathnames = {
  '/': '/',
  '/sign-in': {
    vi: '/dang-nhap',
    en: '/sign-in'
  },
  '/register': {
    vi: '/dang-ky',
    en: '/register'
  },
  '/forgot-password': {
    vi: '/quen-mat-khau',
    en: '/forgot-password'
  },
  '/reset-password': {
    vi: '/dat-lai-mat-khau',
    en: '/reset-password'
  },
  '/account': {
    vi: '/tai-khoan',
    en: '/account'
  },
  '/account/addresses': {
    vi: '/tai-khoan/dia-chi',
    en: '/account/addresses'
  },
  '/catalog': {
    vi: '/cua-hang',
    en: '/catalog'
  },
  '/category/[categorySlug]': {
    vi: '/danh-muc/[categorySlug]',
    en: '/category/[categorySlug]'
  },
  '/collection/[collectionSlug]': {
    vi: '/bo-suu-tap/[collectionSlug]',
    en: '/collection/[collectionSlug]'
  },
  '/product/[productSlug]': {
    vi: '/san-pham/[productSlug]',
    en: '/product/[productSlug]'
  },
  '/cart': {
    vi: '/gio-hang',
    en: '/cart'
  },
  '/checkout': {
    vi: '/thanh-toan',
    en: '/checkout'
  },
  '/orders/[orderNumber]': {
    vi: '/don-hang/[orderNumber]',
    en: '/orders/[orderNumber]'
  }
} as const;

export type InternalPathname = keyof typeof pathnames;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  pathnames,
  localeDetection: false
});

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return 'en';
  }

  return /\bvi(?:-|;|,|$)/i.test(acceptLanguage) ? 'vi' : 'en';
}

export function getLocalizedPath(pathname: InternalPathname, locale: Locale): `/${Locale}${string}` {
  const localized = pathnames[pathname];
  const suffix = typeof localized === 'string' ? localized : localized[locale];
  return `/${locale}${suffix === '/' ? '' : suffix}`;
}

export function getCatalogPath(locale: Locale) {
  return getLocalizedPath('/catalog', locale);
}

export function getCategoryPath(locale: Locale, categorySlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'danh-muc' : 'category'}/${categorySlug}`;
}

export function getCollectionPath(locale: Locale, collectionSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'bo-suu-tap' : 'collection'}/${collectionSlug}`;
}

export function getProductPath(locale: Locale, productSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${productSlug}`;
}

export function getCartPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/cart', locale);
}

export function getCheckoutPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/checkout', locale);
}

export function getAccountAddressesPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/account/addresses', locale);
}

export function getOrderPath(locale: Locale, orderNumber: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'don-hang' : 'orders'}/${encodeURIComponent(orderNumber)}`;
}

export function getEquivalentLocalizedPath(
  currentPath: string,
  targetLocale: Locale
): `/${Locale}${string}` {
  const [, currentLocale, ...segments] = currentPath.split('/');
  const currentSuffix = `/${segments.join('/')}`.replace(/\/$/, '') || '/';

  for (const internalPathname of Object.keys(pathnames) as InternalPathname[]) {
    const value = pathnames[internalPathname];
    const candidates =
      typeof value === 'string'
        ? locales.map((locale) => getLocalizedPath(internalPathname, locale))
        : locales.map((locale) => `/${locale}${value[locale]}`);

    if (
      isLocale(currentLocale) &&
      candidates.includes(`/${currentLocale}${currentSuffix}` as `/${Locale}${string}`)
    ) {
      return getLocalizedPath(internalPathname, targetLocale);
    }
  }

  return `/${targetLocale}`;
}
