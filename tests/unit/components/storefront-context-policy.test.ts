import { describe, expect, it } from 'vitest';
import { shouldRevalidateStorefrontContext } from '@/components/storefront-context-policy';

describe('storefront context revalidation policy', () => {
  it('does not revalidate a fresh snapshot', () => {
    expect(shouldRevalidateStorefrontContext(1_000, 60_000)).toBe(false);
  });

  it('revalidates a missing or stale snapshot', () => {
    expect(shouldRevalidateStorefrontContext(null, 60_000)).toBe(true);
    expect(shouldRevalidateStorefrontContext(1_000, 301_001)).toBe(true);
  });
});
