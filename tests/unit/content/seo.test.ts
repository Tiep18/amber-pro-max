import {describe, expect, it, vi} from 'vitest';
import {absoluteUrl, localizedAlternates, sitemapIndexXml, urlSetXml} from '@/content/seo/metadata';

describe('localized SEO metadata (SEO-02, D-05, D-06)', () => {
  it('builds canonical absolute URLs from the configured site origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');

    expect(absoluteUrl('/en/blog/care')).toBe('https://example.test/en/blog/care');
  });

  it('builds localized hreflang alternates from locale-specific paths', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');

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
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');

    expect(sitemapIndexXml(['/sitemaps/en?x=<private>'])).toContain('%3Cprivate%3E');
    expect(urlSetXml(['/en/product/bear&friend'])).toContain('bear&amp;friend');
  });
});
