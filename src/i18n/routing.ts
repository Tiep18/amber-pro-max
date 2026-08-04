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
  '/account/wishlist': {
    vi: '/tai-khoan/yeu-thich',
    en: '/account/wishlist'
  },
  '/account/orders': {
    vi: '/tai-khoan/don-hang',
    en: '/account/orders'
  },
  '/account/patterns': {
    vi: '/tai-khoan/mau-pdf',
    en: '/account/patterns'
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
  '/technique/[techniqueSlug]': {
    vi: '/ky-thuat/[techniqueSlug]',
    en: '/technique/[techniqueSlug]'
  },
  '/tag/[tagSlug]': {
    vi: '/the/[tagSlug]',
    en: '/tag/[tagSlug]'
  },
  '/product/[productSlug]': {
    vi: '/san-pham/[productSlug]',
    en: '/product/[productSlug]'
  },
  '/blog': {
    vi: '/bai-viet',
    en: '/blog'
  },
  '/blog/[postSlug]': {
    vi: '/bai-viet/[postSlug]',
    en: '/blog/[postSlug]'
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
  },
  '/orders/[orderNumber]/qr': {
    vi: '/don-hang/[orderNumber]/ma-qr',
    en: '/orders/[orderNumber]/qr'
  },
  '/newsletter/unsubscribe': {
    vi: '/ban-tin/huy-dang-ky',
    en: '/newsletter/unsubscribe'
  },
  '/exception-request': {
    vi: '/yeu-cau-ngoai-le',
    en: '/exception-request'
  },
  '/guest-order': {
    vi: '/don-hang-khach',
    en: '/guest-order'
  },
  '/contact': {
    vi: '/lien-he',
    en: '/contact'
  }
} as const;

export type InternalPathname = keyof typeof pathnames;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  pathnames,
  localeDetection: true
});

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const preferences = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [languageTag = '', ...parameters] = part.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      return {languageTag, quality: Number.isFinite(quality) ? quality : 0, index};
    })
    .filter(({quality}) => quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const {languageTag} of preferences) {
    const language = languageTag.toLowerCase().split('-')[0];
    if (isLocale(language)) {
      return language;
    }
  }

  return defaultLocale;
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

export function getTechniquePath(locale: Locale, techniqueSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'ky-thuat' : 'technique'}/${encodeURIComponent(techniqueSlug)}`;
}

export function getTagPath(locale: Locale, tagSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'the' : 'tag'}/${encodeURIComponent(tagSlug)}`;
}

export function getProductPath(locale: Locale, productSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'san-pham' : 'product'}/${productSlug}`;
}

export function getBlogPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/blog', locale);
}

export function getBlogPostPath(locale: Locale, postSlug: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'bai-viet' : 'blog'}/${postSlug}`;
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

export function getAccountWishlistPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/account/wishlist', locale);
}

export function getAccountOrdersPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/account/orders', locale);
}

export function getAccountPatternsPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/account/patterns', locale);
}

export function getOrderPath(locale: Locale, orderNumber: string): `/${Locale}${string}` {
  return `/${locale}/${locale === 'vi' ? 'don-hang' : 'orders'}/${encodeURIComponent(orderNumber)}`;
}

export function getOrderQrDownloadPath(locale: Locale, orderNumber: string): `/${Locale}${string}` {
  return `${getOrderPath(locale, orderNumber)}/${locale === 'vi' ? 'ma-qr' : 'qr'}`;
}

export function getNewsletterUnsubscribePath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/newsletter/unsubscribe', locale);
}

export function getExceptionRequestPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/exception-request', locale);
}

export function getGuestOrderPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/guest-order', locale);
}

export function getContactPath(locale: Locale): `/${Locale}${string}` {
  return getLocalizedPath('/contact', locale);
}

export function getEquivalentLocalizedPath(
  currentPath: string,
  targetLocale: Locale,
  localizedSlugs?: Record<Locale, string>
): `/${Locale}${string}` {
  const [, currentLocale, ...segments] = currentPath.split('/');
  const currentSuffix = `/${segments.join('/')}`.replace(/\/$/, '') || '/';

  if (isLocale(currentLocale) && localizedSlugs) {
    for (const internalPathname of Object.keys(pathnames) as InternalPathname[]) {
      const value = pathnames[internalPathname];
      if (typeof value === 'string' || !internalPathname.includes('[')) {
        continue;
      }

      const currentTemplate = value[currentLocale];
      const parameterStart = currentTemplate.indexOf('[');
      const currentPrefix = currentTemplate.slice(0, parameterStart);
      if (currentSuffix.startsWith(currentPrefix) && currentSuffix.slice(currentPrefix.length)) {
        const targetTemplate = value[targetLocale];
        const targetPrefix = targetTemplate.slice(0, targetTemplate.indexOf('['));
        return `/${targetLocale}${targetPrefix}${encodeURIComponent(localizedSlugs[targetLocale])}`;
      }
    }
  }

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

export type RouteQueryKind = 'catalog' | 'auth' | 'other';

const catalogQueryKeys = ['search', 'type', 'category', 'technique', 'tag', 'sort'] as const;

function isSafeLocalizedInternalPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://local.invalid');
  } catch {
    return false;
  }

  const [, locale] = parsed.pathname.split('/');
  return (
    parsed.origin === 'https://local.invalid' &&
    isLocale(locale) &&
    parsed.search === '' &&
    parsed.hash === ''
  );
}

export function allowlistedRouteQuery(routeKind: RouteQueryKind, searchParams: URLSearchParams) {
  const result = new URLSearchParams();

  if (routeKind === 'catalog') {
    for (const key of catalogQueryKeys) {
      const values = searchParams.getAll(key);
      if (values.length === 1 && values[0]) {
        result.set(key, values[0]);
      }
    }
  } else if (routeKind === 'auth') {
    const values = searchParams.getAll('next');
    const hasOnlyNext = [...searchParams.keys()].every((key) => key === 'next');
    if (values.length === 1 && hasOnlyNext && isSafeLocalizedInternalPath(values[0])) {
      result.set('next', values[0]);
    }
  }

  const query = result.toString();
  return query ? `?${query}` : '';
}

export function getRouteQueryKind(pathname: string): RouteQueryKind {
  const route = pathname.split('/').filter(Boolean)[1] ?? '';

  if (
    [
      'catalog',
      'cua-hang',
      'category',
      'danh-muc',
      'collection',
      'bo-suu-tap',
      'technique',
      'ky-thuat',
      'tag',
      'the'
    ].includes(route)
  ) {
    return 'catalog';
  }

  if (
    [
      'sign-in',
      'dang-nhap',
      'register',
      'dang-ky',
      'forgot-password',
      'quen-mat-khau',
      'reset-password',
      'dat-lai-mat-khau'
    ].includes(route)
  ) {
    return 'auth';
  }

  return 'other';
}

export function getLocaleSwitchHref(
  currentPath: string,
  targetLocale: Locale,
  searchParams: URLSearchParams,
  localizedSlugs?: Record<Locale, string>
) {
  return `${getEquivalentLocalizedPath(
    currentPath,
    targetLocale,
    localizedSlugs
  )}${allowlistedRouteQuery(getRouteQueryKind(currentPath), searchParams)}`;
}
