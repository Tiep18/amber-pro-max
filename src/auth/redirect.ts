import {getLocalizedPath, isLocale, locales, pathnames, type InternalPathname, type Locale} from '@/i18n/routing';

const allowedPaths = new Set(
  [
    ...(Object.keys(pathnames) as InternalPathname[]).flatMap((pathname) =>
      locales.map((locale) => getLocalizedPath(pathname, locale))
    ),
    '/admin'
  ]
);

function isAllowedAdminPath(pathname: string) {
  return (
    pathname === '/admin' ||
    pathname === '/admin/catalog' ||
    pathname === '/admin/catalog/new' ||
    /^\/admin\/catalog\/[0-9a-f-]+$/i.test(pathname) ||
    /^\/admin\/catalog\/[0-9a-f-]+\/media$/i.test(pathname) ||
    /^\/admin\/catalog\/[0-9a-f-]+\/variants$/i.test(pathname)
  );
}

function fallbackFor(locale: Locale) {
  return getLocalizedPath('/', locale);
}

function safeNestedNext(value: string | null) {
  if (!value || value.startsWith('//') || !value.startsWith('/')) {
    return null;
  }

  const normalized = value.replace(/\/$/, '') || '/';
  return allowedPaths.has(normalized as `/${Locale}${string}`) || isAllowedAdminPath(normalized) ? normalized : null;
}

export function safeRedirect(next: FormDataEntryValue | null | undefined, locale: Locale = 'vi') {
  if (typeof next !== 'string' || next.length === 0) {
    return fallbackFor(locale);
  }

  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallbackFor(locale);
  }

  let parsed: URL;
  try {
    parsed = new URL(next, 'https://local.invalid');
  } catch {
    return fallbackFor(locale);
  }

  if (parsed.origin !== 'https://local.invalid') {
    return fallbackFor(locale);
  }

  const [, routeLocale] = parsed.pathname.split('/');
  if (!isLocale(routeLocale) && !isAllowedAdminPath(parsed.pathname)) {
    return fallbackFor(locale);
  }

  const normalizedPath = parsed.pathname.replace(/\/$/, '') || `/${routeLocale}`;
  if (!allowedPaths.has(normalizedPath as `/${Locale}${string}`) && !isAllowedAdminPath(normalizedPath)) {
    return fallbackFor(locale);
  }

  const query = new URLSearchParams();
  const nestedNext = safeNestedNext(parsed.searchParams.get('next'));
  if (nestedNext) {
    query.set('next', nestedNext);
  }

  const queryString = query.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}
