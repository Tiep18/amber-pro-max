import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('catalog sidebar active style', () => {
  it('uses the admin navigation active-state treatment', async () => {
    const [catalog, admin] = await Promise.all([
      readFile(
        new URL('../../../src/components/catalog/catalog-filter-content.tsx', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL('../../../src/components/admin/admin-navigation.tsx', import.meta.url),
        'utf8'
      )
    ]);

    for (const activeClass of [
      'text-[var(--accent)]',
      'shadow-[inset_3px_0_0_var(--accent)]',
      'rounded-[var(--radius-control)]'
    ]) {
      expect(admin).toContain(activeClass);
      expect(catalog).toContain(activeClass);
    }
    expect(catalog).toContain('bg-[var(--accent-soft,var(--surface-blush))]');
    expect(catalog).toContain("active ? 'text-[var(--accent)]/75'");
  });
});
