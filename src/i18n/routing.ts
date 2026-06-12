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
