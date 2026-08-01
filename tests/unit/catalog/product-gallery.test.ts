import { describe, expect, it } from 'vitest';
import {
  clampGalleryIndex,
  galleryIndexAfterSwipe,
  gallerySwipeThreshold
} from '@/components/catalog/product-gallery-state';

describe('product gallery navigation', () => {
  it('clamps requested images to the available range', () => {
    expect(clampGalleryIndex(-1, 4)).toBe(0);
    expect(clampGalleryIndex(2, 4)).toBe(2);
    expect(clampGalleryIndex(8, 4)).toBe(3);
    expect(clampGalleryIndex(1, 0)).toBe(0);
  });

  it('uses a bounded swipe threshold suitable for small and large galleries', () => {
    expect(gallerySwipeThreshold(240)).toBe(40);
    expect(gallerySwipeThreshold(400)).toBe(48);
    expect(gallerySwipeThreshold(1200)).toBe(72);
  });

  it('moves in the swipe direction only after the threshold is crossed', () => {
    const base = { currentIndex: 1, imageCount: 4, containerWidth: 400 };

    expect(galleryIndexAfterSwipe({ ...base, deltaX: -47 })).toBe(1);
    expect(galleryIndexAfterSwipe({ ...base, deltaX: -48 })).toBe(2);
    expect(galleryIndexAfterSwipe({ ...base, deltaX: 48 })).toBe(0);
  });

  it('does not wrap past the first or last image', () => {
    expect(
      galleryIndexAfterSwipe({
        currentIndex: 0,
        imageCount: 3,
        deltaX: 80,
        containerWidth: 400
      })
    ).toBe(0);
    expect(
      galleryIndexAfterSwipe({
        currentIndex: 2,
        imageCount: 3,
        deltaX: -80,
        containerWidth: 400
      })
    ).toBe(2);
  });
});
