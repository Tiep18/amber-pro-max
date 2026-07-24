import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

describe('static catalog route contract', () => {
  it('keeps request query state out of the deterministic server route', async () => {
    const page = await source('../../../src/app/[locale]/catalog/page.tsx');

    expect(page).toContain("dynamic = 'force-static'");
    expect(page).toContain('revalidate = 300');
    expect(page).toContain('setRequestLocale(locale)');
    expect(page).not.toContain('searchParams');
    expect(page).toContain('<CatalogCommerce');
  });

  it('keeps every allowlisted query dimension in the client control form', async () => {
    const controls = await source(
      '../../../src/components/catalog/catalog-controls-client.tsx'
    );

    expect(controls).toContain('name="type"');
    expect(controls).toContain('name="category"');
    expect(controls).toContain('name="technique"');
    expect(controls).toContain('name="tag"');
    expect(controls).toContain('name="sort"');
    expect(controls).not.toContain('name="market"');
  });

  it('keeps the existing catalog discovery shell inside the commerce island', async () => {
    const commerce = await source(
      '../../../src/components/catalog/catalog-commerce.tsx'
    );

    expect(commerce).toContain('CatalogMobileFilters');
    expect(commerce).toContain('productTypeTabs');
    expect(commerce).toContain('catalog-result-count');
    expect(commerce).toContain('CatalogResultGrid');
  });
});
