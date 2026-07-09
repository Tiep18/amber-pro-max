import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {absoluteUrl, localizedAlternates, sitemapIndexXml, urlSetXml} from '@/content/seo/metadata';

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
      urlSetXml([{path: '/en/product/bear', lastModified: '2026-06-28T00:00:00Z'}])
    ).toContain('<lastmod>2026-06-28T00:00:00Z</lastmod>');
  });
});
