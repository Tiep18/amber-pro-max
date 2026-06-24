import {describe, expect, it, vi} from 'vitest';
import {articleJsonLd, breadcrumbJsonLd, productJsonLd, serializeJsonLd} from '@/content/seo/json-ld';

describe('safe JSON-LD (SEO-03, D-08)', () => {
  it('escapes less-than characters before rendering into a script tag', () => {
    const serialized = serializeJsonLd({name: '</script><script>alert(1)</script>'});

    expect(serialized).toContain('\\u003c/script>');
    expect(serialized).not.toContain('</script>');
  });

  it('builds Product JSON-LD with authoritative offer facts', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');

    expect(
      productJsonLd({
        name: 'Both-market bear',
        description: 'Handmade bear.',
        path: '/en/product/both-market-bear',
        currency: 'USD',
        priceMinor: 3100,
        available: true
      })
    ).toMatchObject({
      '@type': 'Product',
      name: 'Both-market bear',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: '31.00',
        availability: 'https://schema.org/InStock'
      }
    });
  });

  it('builds Article and Breadcrumb JSON-LD from public localized paths only', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.test');

    expect(articleJsonLd({headline: 'Care', description: 'Care notes.', path: '/en/blog/care'})).toMatchObject({
      '@type': 'Article',
      url: 'https://example.test/en/blog/care'
    });
    expect(breadcrumbJsonLd([{name: 'Blog', path: '/en/blog'}])).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [{item: 'https://example.test/en/blog', position: 1}]
    });
  });
});
