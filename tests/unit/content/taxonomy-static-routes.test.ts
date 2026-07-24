import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

const categoryPagePath =
  '../../../src/app/[locale]/category/[categorySlug]/page.tsx';
const collectionPagePath =
  '../../../src/app/[locale]/collection/[collectionSlug]/page.tsx';
const techniquePagePath =
  '../../../src/app/[locale]/technique/[techniqueSlug]/page.tsx';
const tagPagePath =
  '../../../src/app/[locale]/tag/[tagSlug]/page.tsx';

describe('static taxonomy route contract', () => {
  it.each([
    ['category', categoryPagePath, 'categorySlug'],
    ['collection', collectionPagePath, 'collectionSlug']
  ])(
    'keeps the %s server route deterministic and delegates visible commerce',
    async (_surface, path, slugKey) => {
      const page = await source(path);

      expect(page).toContain("dynamic = 'force-static'");
      expect(page).toContain('revalidate = 300');
      expect(page).toContain('setRequestLocale(locale)');
      expect(page).not.toMatch(/\b(?:cookies|headers)\s*\(/);
      expect(page).not.toContain('searchParams');
      expect(page).toContain('<CatalogCommerce');
      expect(page).toContain(`fixedFilters={{ ${slugKey} }}`);
      expect(page).not.toContain('<ProductCard');
    }
  );

  it.each([
    ['category', categoryPagePath],
    ['collection', collectionPagePath]
  ])(
    'unions Vietnam and international facets for %s static params',
    async (_surface, path) => {
      const page = await source(path);

      expect(page).toMatch(/getCachedCatalogFacets\(locale,\s*'vn'\)/);
      expect(page).toMatch(/getCachedCatalogFacets\(locale,\s*'intl'\)/);
      expect(page).toContain('new Map');
    }
  );

  it.each([
    ['technique', techniquePagePath, 'techniqueSlug', 'getTechniquePath'],
    ['tag', tagPagePath, 'tagSlug', 'getTagPath']
  ])(
    'ships an indexable static %s page with a fixed private projection',
    async (surface, path, slugKey, pathHelper) => {
      const page = await source(path);

      expect(page).toContain("dynamic = 'force-static'");
      expect(page).toContain('revalidate = 300');
      expect(page).toContain('setRequestLocale(locale)');
      expect(page).not.toMatch(/\b(?:cookies|headers)\s*\(/);
      expect(page).not.toContain('searchParams');
      expect(page).toContain(`surface="${surface}"`);
      expect(page).toContain(`fixedFilters={{ ${slugKey} }}`);
      expect(page).toContain(pathHelper);
      expect(page).toContain('localizedMetadata');
      expect(page).toContain('breadcrumbJsonLd');
      expect(page).toContain('itemListJsonLd');
    }
  );

  it.each([
    ['technique', techniquePagePath],
    ['tag', tagPagePath]
  ])(
    'unions locale-stable Vietnam and international %s facet identities',
    async (surface, path) => {
      const page = await source(path);

      expect(page).toContain("market: 'vn'");
      expect(page).toContain("market: 'intl'");
      expect(page).toContain(`surface: '${surface}'`);
      expect(page).toContain('new Map');
    }
  );
});
