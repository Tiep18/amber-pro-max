import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

describe('storefront performance boundaries', () => {
  it('keeps the locale layout free of full client message serialization', async () => {
    const layout = await source('../../../src/app/[locale]/layout.tsx');
    expect(layout).not.toContain('NextIntlClientProvider');
    expect(layout).not.toContain('getRequestMarket');
  });

  it.each([
    '../../../src/components/catalog/product-card-image.tsx',
    '../../../src/components/catalog/product-gallery.tsx',
    '../../../src/app/[locale]/blog/page.tsx',
    '../../../src/app/[locale]/blog/[postSlug]/page.tsx'
  ])('uses the Next image pipeline in %s', async (path) => {
    const component = await source(path);
    expect(component).toContain("from 'next/image'");
    expect(component).not.toMatch(/<img\s/);
    expect(component).toContain('sizes=');
  });

  it('keeps product cards routed through the optimized image boundary', async () => {
    const component = await source('../../../src/components/catalog/product-card.tsx');
    expect(component).toContain("from '@/components/catalog/product-card-image'");
    expect(component).not.toMatch(/<img\s/);
  });

  it('keeps the reusable product card view client-safe and projection-driven', async () => {
    const [view, wrapper] = await Promise.all([
      source('../../../src/components/catalog/product-card-view.tsx'),
      source('../../../src/components/catalog/product-card.tsx')
    ]);

    expect(view.trimStart()).toMatch(/^['"]use client['"]/);
    expect(view).not.toContain('next-intl/server');
    expect(view).not.toContain('getRequestMarket');
    expect(view).not.toContain('useStorefrontContext');
    expect(view).toContain('commerceState');
    expect(view).toContain('aria-hidden="true"');

    expect(wrapper).toContain("from '@/components/catalog/product-card-view'");
    expect(wrapper).toContain('<ProductCardView');
  });

  it('protects cart state from stale quote responses', async () => {
    const provider = await source('../../../src/components/cart/cart-provider.tsx');
    expect(provider).toContain('latestQuoteRequest');
    expect(provider).toContain('requestId === latestQuoteRequest.current');
  });

  it('marks editorial routes for five-minute ISR', async () => {
    const blog = await source('../../../src/app/[locale]/blog/page.tsx');
    const policy = await source('../../../src/app/[locale]/policies/[policySlug]/page.tsx');
    expect(blog).toContain("dynamic = 'force-static'");
    expect(blog).toContain('revalidate = 300');
    expect(policy).toContain("dynamic = 'force-static'");
    expect(policy).toContain('revalidate = 300');
  });
});
