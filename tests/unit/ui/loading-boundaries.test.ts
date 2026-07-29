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

type LayoutContract = {
  name: string;
  skeleton: string;
  contentPath: string;
  classes: readonly string[];
  contentClasses?: readonly string[];
  skeletonClasses?: readonly string[];
  linkedPath?: string;
  linkedClasses?: readonly string[];
  linkedOnlyClasses?: readonly string[];
};

const layoutContracts: readonly LayoutContract[] = [
  {
    name: 'storefront',
    skeleton: 'StorefrontPageSkeleton',
    contentPath: 'src/app/[locale]/page.tsx',
    classes: [
      'min-h-[620px]',
      'lg:min-h-[540px]',
      'lg:grid-cols-[0.86fr_1.14fr]',
      'min-[420px]:flex-row',
      'lg:grid-cols-[1.14fr_0.86fr]'
    ]
  },
  {
    name: 'catalog',
    skeleton: 'CatalogPageSkeleton',
    contentPath: 'src/components/catalog/catalog-commerce.tsx',
    classes: ['lg:grid-cols-[260px_minmax(0,1fr)]', 'min-[480px]:grid-cols-2', 'lg:grid-cols-3']
  },
  {
    name: 'product',
    skeleton: 'ProductPageSkeleton',
    contentPath: 'src/app/[locale]/product/[productSlug]/page.tsx',
    classes: ['lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]', 'lg:gap-12', 'lg:py-12'],
    linkedPath: 'src/components/catalog/product-gallery.tsx',
    linkedClasses: ['aspect-square']
  },
  {
    name: 'checkout',
    skeleton: 'CheckoutPageSkeleton',
    contentPath: 'src/components/checkout/checkout-page.tsx',
    classes: [
      '!px-3 pb-28 pt-6 sm:!px-6 lg:!px-8',
      'px-4 py-5 sm:px-6',
      'pb-28',
      'lg:grid-cols-[minmax(0,1fr)_400px]',
      'lg:pb-10'
    ],
    contentClasses: ['!px-3 py-7 sm:!px-6 lg:!px-8', 'px-4 py-10', 'sm:px-5'],
    skeletonClasses: ['p-4 sm:p-5'],
    linkedPath: 'src/components/checkout/order-summary.tsx',
    linkedClasses: ['fixed inset-x-0 bottom-0', 'px-3', 'lg:hidden'],
    linkedOnlyClasses: ['px-4 py-4 sm:px-5']
  },
  {
    name: 'account',
    skeleton: 'AccountPageSkeleton',
    contentPath: 'src/app/[locale]/account/account-overview.tsx',
    classes: [
      'lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]',
      'grid-cols-[36px_1fr_auto]',
      'border-b border-[var(--border)]'
    ]
  },
  {
    name: 'order',
    skeleton: 'OrderPageSkeleton',
    contentPath: 'src/components/payments/order-payment-page.tsx',
    classes: ['lg:grid-cols-[minmax(0,1fr)_380px]', 'lg:sticky', 'lg:top-24']
  },
  {
    name: 'admin',
    skeleton: 'AdminPageSkeleton',
    contentPath: 'src/app/admin/page.tsx',
    classes: ['md:grid-cols-3', 'md:grid-cols-4']
  }
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
    expect(source).toContain('<div aria-hidden="true" className={cn(className)}>');
    expect(source).not.toMatch(/@\/(catalog\/queries|payments|checkout|fulfillment|lib\/supabase)/);
    expect(source).not.toMatch(/<(?:a|button|Link)\b/);
    expect(source).not.toMatch(/\b(?:VND|USD|PayPal|VietQR)\b|\$\d|signedUrl|entitlement/);
  });

  test.each(layoutContracts)(
    '$name skeleton preserves the canonical responsive layout contract',
    ({
      skeleton,
      contentPath,
      classes,
      contentClasses,
      skeletonClasses,
      linkedPath,
      linkedClasses,
      linkedOnlyClasses
    }) => {
      const source = readFileSync('src/components/loading/page-skeletons.tsx', 'utf8');
      const contentSource = readFileSync(contentPath, 'utf8');
      const skeletonStart = source.indexOf(`export function ${skeleton}`);
      const skeletonEnd = source.indexOf('\nexport function ', skeletonStart + 1);
      const skeletonSource = source.slice(
        skeletonStart,
        skeletonEnd === -1 ? source.length : skeletonEnd
      );
      const contractSource = skeleton === 'CatalogPageSkeleton' ? source : skeletonSource;

      expect(skeletonStart).toBeGreaterThanOrEqual(0);
      for (const className of classes) {
        expect(contentSource).toContain(className);
        expect(contractSource).toContain(className);
      }
      for (const className of contentClasses ?? []) {
        expect(contentSource).toContain(className);
      }
      for (const className of skeletonClasses ?? []) {
        expect(contractSource).toContain(className);
      }

      if (linkedPath && linkedClasses) {
        const linkedSource = readFileSync(linkedPath, 'utf8');
        for (const className of linkedClasses) {
          expect(linkedSource).toContain(className);
          expect(skeletonSource).toContain(className);
        }
        for (const className of linkedOnlyClasses ?? []) {
          expect(linkedSource).toContain(className);
        }
      }
    }
  );

  test('catalog route and projection loading share the neutral product-card shell', () => {
    const skeletonSource = readFileSync('src/components/loading/page-skeletons.tsx', 'utf8');
    const commerceSource = readFileSync('src/components/catalog/catalog-commerce.tsx', 'utf8');
    const productSource = readFileSync('src/components/catalog/product-card-view.tsx', 'utf8');

    expect(skeletonSource).toContain('export function ProductCardSkeleton');
    for (const className of [
      'grid-rows-[auto_1fr]',
      'rounded-[18px]',
      'ring-1 ring-[var(--border)]/70',
      'aspect-[5/4]',
      'p-3 sm:gap-4 sm:p-5'
    ]) {
      expect(productSource).toContain(className);
      expect(skeletonSource).toContain(className);
    }
    expect(commerceSource).toContain('import { ProductCardSkeleton }');
    expect(commerceSource).toContain('<ProductCardSkeleton key={index} />');
    expect(commerceSource).toContain('data-testid="catalog-product-grid-skeleton"');
    expect(commerceSource).toContain('Array.from({ length: 12 }');
  });

  test('account skeleton renders four border-separated destination rows', () => {
    const source = readFileSync('src/components/loading/page-skeletons.tsx', 'utf8');
    const start = source.indexOf('export function AccountPageSkeleton');
    const end = source.indexOf('\nexport function ', start + 1);
    const accountSource = source.slice(start, end);

    expect(accountSource).toContain('Array.from({ length: 4 }');
    expect(accountSource).toContain('border-b border-[var(--border)] py-4');
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
