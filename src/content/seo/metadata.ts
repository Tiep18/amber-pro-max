import type {Locale} from '@/i18n/routing';
import {getClientEnv} from '@/lib/env/client';

export function siteUrl() {
  return getClientEnv().NEXT_PUBLIC_SITE_URL;
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

type SitemapUrl = string | {path: string; lastModified?: string | null};

function sitemapUrlEntry(entry: SitemapUrl) {
  const path = typeof entry === 'string' ? entry : entry.path;
  const lastModified = typeof entry === 'string' ? null : entry.lastModified;
  const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : '';
  return `<url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmod}</url>`;
}

export function urlSetXml(paths: SitemapUrl[]) {
  const body = paths.map(sitemapUrlEntry).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
