import {isLocale} from './i18n/routing';

const PUBLIC_FILE = /\.(.*)$/;

export function isUnprefixedCustomerPath(pathname: string) {
  const firstSegment = pathname.split('/')[1];
  return (
    !isLocale(firstSegment) &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/sitemaps') &&
    !PUBLIC_FILE.test(pathname)
  );
}
