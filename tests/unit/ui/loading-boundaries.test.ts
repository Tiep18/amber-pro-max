import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const routeLoadingFiles = [
  'src/app/[locale]/loading.tsx',
  'src/app/[locale]/catalog/loading.tsx',
  'src/app/[locale]/product/[productSlug]/loading.tsx',
  'src/app/[locale]/checkout/loading.tsx',
  'src/app/[locale]/account/loading.tsx',
  'src/app/[locale]/orders/[orderNumber]/loading.tsx',
  'src/app/admin/loading.tsx'
];

describe('route loading boundaries', () => {
  test.each(routeLoadingFiles)('%s delegates to a presentation-only skeleton', (sourcePath) => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('@/components/loading/page-skeletons');
    expect(source).not.toMatch(/supabase|priceMinor|inventory|paymentStatus|signedUrl/);
  });

  test('shared skeletons announce loading without importing commerce authority', () => {
    const source = readFileSync('src/components/loading/page-skeletons.tsx', 'utf8');

    expect(source).toContain('role="status"');
    expect(source).toContain('aria-busy="true"');
    expect(source).not.toMatch(/@\/(catalog\/queries|payments|checkout|fulfillment|lib\/supabase)/);
  });

  test.each([
    'src/app/[locale]/catalog/page.tsx',
    'src/app/[locale]/product/[productSlug]/page.tsx'
  ])('%s keeps its static and ISR contract', (sourcePath) => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain("export const dynamic = 'force-static'");
    expect(source).toContain('export const revalidate = 300');
    expect(source).toContain('generateMetadata');
    expect(source).toContain('JsonLd');
  });
});
