import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { catalogListCacheKey, catalogProductCacheKey } from '@/catalog/cache-keys';

describe('public catalog cache', () => {
  it('separates locale and market in list and detail keys', () => {
    expect(catalogListCacheKey({ locale: 'en', market: 'vn' })).not.toEqual(
      catalogListCacheKey({ locale: 'en', market: 'intl' })
    );
    expect(catalogProductCacheKey('en', 'vn', 'amber-bear')).not.toEqual(
      catalogProductCacheKey('vi', 'vn', 'amber-bear')
    );
  });

  it('does not depend on request or privileged clients', async () => {
    const source = await readFile(
      new URL('../../../src/catalog/public-cache.ts', import.meta.url),
      'utf8'
    );

    expect(source).not.toMatch(
      /cookies\(|headers\(|createSupabaseServerClient|createSupabaseAdminClient/
    );
    expect(source).toContain('unstable_cache');
    expect(source).toContain('revalidate: 300');
  });
});
