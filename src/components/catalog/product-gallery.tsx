'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  clampGalleryIndex,
  galleryIndexAfterSwipe
} from '@/components/catalog/product-gallery-state';

export type ProductGalleryImage = {
  url: string;
  alt: string;
};

export type ProductGalleryLabels = {
  carousel: string;
  previous: string;
  next: string;
  thumbnails: string;
  showImages: string[];
  imagePositions: string[];
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: 'pending' | 'horizontal' | 'vertical';
  offset: number;
};

const navigationButtonClassName =
  'group/nav absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center opacity-75 transition-opacity duration-200 hover:!opacity-100 focus-visible:!opacity-100 sm:opacity-60 sm:group-hover:opacity-90 disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none';

const navigationButtonSurfaceClassName =
  'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)]/50 text-[var(--foreground)]/70 ring-1 ring-white/40 backdrop-blur-[2px] transition-[background-color,color,box-shadow] duration-200 group-hover:bg-[var(--surface)]/65 group-hover/nav:!bg-[var(--surface)]/90 group-hover/nav:!text-[var(--foreground)] group-hover/nav:shadow-sm group-focus-visible/nav:!bg-[var(--surface)]/90 group-focus-visible/nav:!text-[var(--foreground)] group-focus-visible/nav:shadow-sm motion-reduce:transition-none';

export function ProductGallery({
  images,
  alt,
  labels
}: {
  images: ProductGalleryImage[];
  alt: string;
  labels: ProductGalleryLabels;
}) {
  const normalizedImages = useMemo(() => images.filter((image) => image.url), [images]);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);
  const trackId = useId();
  const selectedIndex = clampGalleryIndex(requestedIndex, normalizedImages.length);
  const hasMultipleImages = normalizedImages.length > 1;

  function selectImage(index: number) {
    setRequestedIndex(clampGalleryIndex(index, normalizedImages.length));
    setDragOffset(0);
  }

  function resetDrag() {
    dragState.current = null;
    setDragOffset(0);
    setIsDragging(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      !hasMultipleImages ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: 'pending',
      offset: 0
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (drag.axis === 'pending' && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6) {
      drag.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }
    if (drag.axis !== 'horizontal') {
      return;
    }

    event.preventDefault();
    const width = event.currentTarget.clientWidth;
    const isPullingPastStart = selectedIndex === 0 && deltaX > 0;
    const isPullingPastEnd = selectedIndex === normalizedImages.length - 1 && deltaX < 0;
    const resistedOffset = isPullingPastStart || isPullingPastEnd ? deltaX * 0.22 : deltaX;
    drag.offset = Math.max(-width * 0.9, Math.min(width * 0.9, resistedOffset));
    setIsDragging(true);
    setDragOffset(drag.offset);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.axis === 'horizontal') {
      setRequestedIndex(
        galleryIndexAfterSwipe({
          currentIndex: selectedIndex,
          imageCount: normalizedImages.length,
          deltaX: drag.offset,
          containerWidth: event.currentTarget.clientWidth
        })
      );
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetDrag();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!hasMultipleImages) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectImage(selectedIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectImage(selectedIndex + 1);
    }
  }

  const positionLabel = labels.imagePositions[selectedIndex] ?? '';

  return (
    <section aria-label={alt} aria-roledescription={labels.carousel} className="grid gap-3">
      <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[0_18px_54px_rgba(91,55,35,0.08)]">
        <div
          className={`relative aspect-square select-none overflow-hidden touch-pan-y ${
            hasMultipleImages ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          tabIndex={hasMultipleImages ? 0 : undefined}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetDrag}
        >
          {normalizedImages.length > 0 ? (
            <div
              id={trackId}
              data-testid="product-gallery-track"
              className={`flex h-full will-change-transform motion-reduce:transition-none ${
                isDragging
                  ? 'transition-none'
                  : 'transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
              style={{
                transform: `translate3d(calc(${-selectedIndex * 100}% + ${dragOffset}px), 0, 0)`
              }}
            >
              {normalizedImages.map((image, index) => (
                <div
                  key={`${image.url}-${index}`}
                  aria-hidden={selectedIndex !== index}
                  className="relative h-full w-full shrink-0"
                >
                  <Image
                    src={image.url}
                    alt={selectedIndex === index ? image.alt : ''}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    draggable={false}
                    className="pointer-events-none object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-[var(--muted-foreground)]">
              {alt}
            </div>
          )}

          {hasMultipleImages ? (
            <>
              <button
                type="button"
                aria-label={labels.previous}
                aria-controls={trackId}
                disabled={selectedIndex === 0}
                className={`${navigationButtonClassName} left-1 sm:left-2`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => selectImage(selectedIndex - 1)}
              >
                <span className={navigationButtonSurfaceClassName}>
                  <ChevronLeft aria-hidden="true" className="size-[18px]" />
                </span>
              </button>
              <button
                type="button"
                aria-label={labels.next}
                aria-controls={trackId}
                disabled={selectedIndex === normalizedImages.length - 1}
                className={`${navigationButtonClassName} right-1 sm:right-2`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => selectImage(selectedIndex + 1)}
              >
                <span className={navigationButtonSurfaceClassName}>
                  <ChevronRight aria-hidden="true" className="size-[18px]" />
                </span>
              </button>
              <span
                aria-hidden="true"
                className="absolute bottom-2 right-2 rounded-[var(--radius-control)] bg-[var(--foreground)]/72 px-2 py-1 text-xs font-semibold text-[var(--surface)] backdrop-blur-sm"
              >
                {selectedIndex + 1} / {normalizedImages.length}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {hasMultipleImages ? (
        <>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {positionLabel}
          </p>
          <div
            className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6"
            aria-label={labels.thumbnails}
          >
            {normalizedImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                aria-label={labels.showImages[index] ?? labels.imagePositions[index]}
                aria-controls={trackId}
                aria-current={selectedIndex === index}
                className={`min-h-11 min-w-11 overflow-hidden rounded-[var(--radius-control)] border bg-[var(--surface)] transition-[border-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${
                  selectedIndex === index
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/15'
                    : 'border-[var(--border)] opacity-70 hover:opacity-100'
                }`}
                onClick={() => selectImage(index)}
              >
                <span className="relative block aspect-square">
                  <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
