export function clampGalleryIndex(index: number, imageCount: number) {
  if (imageCount <= 0 || !Number.isFinite(index)) {
    return 0;
  }

  return Math.min(imageCount - 1, Math.max(0, Math.trunc(index)));
}

export function gallerySwipeThreshold(containerWidth: number) {
  return Math.min(72, Math.max(40, containerWidth * 0.12));
}

export function galleryIndexAfterSwipe({
  currentIndex,
  imageCount,
  deltaX,
  containerWidth
}: {
  currentIndex: number;
  imageCount: number;
  deltaX: number;
  containerWidth: number;
}) {
  const current = clampGalleryIndex(currentIndex, imageCount);
  const threshold = gallerySwipeThreshold(containerWidth);

  if (deltaX <= -threshold) {
    return clampGalleryIndex(current + 1, imageCount);
  }
  if (deltaX >= threshold) {
    return clampGalleryIndex(current - 1, imageCount);
  }

  return current;
}
