import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('public editorial caches', () => {
  it.each(['blog', 'policies'])('%s cache is request-independent', async (domain) => {
    const path =
      domain === 'blog'
        ? '../../../src/content/blog/public-cache.ts'
        : '../../../src/policies/public-cache.ts';
    const source = await readFile(new URL(path, import.meta.url), 'utf8');

    expect(source).not.toMatch(
      /cookies\(|headers\(|createSupabaseServerClient|createSupabaseAdminClient/
    );
    expect(source).toContain('unstable_cache');
    expect(source).toContain('revalidate: 300');
  });
});
