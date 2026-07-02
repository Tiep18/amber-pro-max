import { describe, expect, it } from 'vitest';
import { resolvePublicProductImageUrl } from '@/catalog/product-image-url';

describe('resolvePublicProductImageUrl', () => {
  it('converts a product storage object path into a public URL', () => {
    expect(
      resolvePublicProductImageUrl('seed/mini-bear-plush-uat.png', 'https://example.supabase.co')
    ).toBe(
      'https://example.supabase.co/storage/v1/object/public/product-media/seed/mini-bear-plush-uat.png'
    );
  });

  it.each([
    'https://cdn.example.com/bear.png',
    'http://localhost:54321/storage/v1/object/public/product-media/bear.png',
    '/images/home/handmade-category.png'
  ])('keeps an already renderable image source unchanged: %s', (source) => {
    expect(resolvePublicProductImageUrl(source, 'https://example.supabase.co')).toBe(source);
  });

  it('returns null for a storage path when the public Supabase URL is unavailable', () => {
    expect(resolvePublicProductImageUrl('seed/bear.png', '')).toBeNull();
  });
});
