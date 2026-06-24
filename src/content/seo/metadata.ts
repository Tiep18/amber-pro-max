import type {Locale} from '@/i18n/routing';

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3210';
}

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl()).toString();
}

export function localizedAlternates(paths: Record<Locale, string>) {
  return {
    vi: absoluteUrl(paths.vi),
    en: absoluteUrl(paths.en)
  };
}
