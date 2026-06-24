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

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function sitemapIndexXml(paths: string[]) {
  const body = paths.map((path) => `<sitemap><loc>${escapeXml(absoluteUrl(path))}</loc></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function urlSetXml(paths: string[]) {
  const body = paths.map((path) => `<url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
