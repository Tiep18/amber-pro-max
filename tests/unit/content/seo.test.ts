import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  absoluteUrl,
  localizedAlternates,
  sitemapIndexXml,
  urlSetXml
} from '@/content/seo/metadata';

describe('localized SEO metadata (SEO-02, D-05, D-06)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds canonical absolute URLs from the configured site origin', () => {
    expect(absoluteUrl('/en/blog/care')).toBe('https://example.test/en/blog/care');
  });

  it('builds localized hreflang alternates from locale-specific paths', () => {
    expect(
      localizedAlternates({
        vi: '/vi/bai-viet/cham-soc',
        en: '/en/blog/care'
      })
    ).toEqual({
      vi: 'https://example.test/vi/bai-viet/cham-soc',
      en: 'https://example.test/en/blog/care'
    });
  });

  it('escapes generated sitemap XML locations', () => {
    expect(sitemapIndexXml(['/sitemaps/en?x=<private>'])).toContain('%3Cprivate%3E');
    expect(urlSetXml(['/en/product/bear&friend'])).toContain('bear&amp;friend');
  });

  it('renders sitemap lastmod when provided', () => {
    expect(
      urlSetXml([{ path: '/en/product/bear', lastModified: '2026-06-28T00:00:00Z' }])
    ).toContain('<lastmod>2026-06-28T00:00:00Z</lastmod>');
  });

  it('keeps localized sitemap taxonomy on a deterministic cross-market public union', async () => {
    const source = await readFile('src/app/sitemaps/[locale]/route.ts', 'utf8');

    expect(source).toContain('getCachedCatalogProjection');
    expect(source).toContain("taxonomyProjectionInput(locale, 'vn')");
    expect(source).toContain("taxonomyProjectionInput(locale, 'intl')");
    expect(source).toContain("facet_type === 'technique'");
    expect(source).toContain("facet_type === 'tag'");
    expect(source).toContain('getTechniquePath');
    expect(source).toContain('getTagPath');
    expect(source).not.toMatch(
      /cookies\(|headers\(|getRequestMarket|ACTIVE_MARKET|x-vercel-ip-country/
    );
  });

  it('keeps sitemap XML locale-only without a market path or query dimension', () => {
    const xml = urlSetXml([
      '/en/technique/42000000-0000-0000-0000-000000000001',
      '/en/tag/43000000-0000-0000-0000-000000000001'
    ]);

    expect(xml).toContain(
      '<loc>https://example.test/en/technique/42000000-0000-0000-0000-000000000001</loc>'
    );
    expect(xml).toContain(
      '<loc>https://example.test/en/tag/43000000-0000-0000-0000-000000000001</loc>'
    );
    expect(xml).not.toMatch(/[?&](?:market|ACTIVE_MARKET)=|\/(?:vn|intl)(?:\/|<)/i);
  });
});
