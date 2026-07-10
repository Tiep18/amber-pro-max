'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

export type ProductGalleryImage = {
  url: string;
  alt: string;
};

export function ProductGallery({ images, alt }: { images: ProductGalleryImage[]; alt: string }) {
  const normalizedImages = useMemo(() => images.filter((image) => image.url), [images]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = normalizedImages[selectedIndex] ?? null;

  return (
    <section aria-label={alt} className="grid gap-3">
      <div className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[0_18px_54px_rgba(91,55,35,0.08)]">
        <div className="relative aspect-square">
          {selected ? (
            <Image
              src={selected.url}
              alt={selected.alt}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-[var(--muted-foreground)]">
              {alt}
            </div>
          )}
        </div>
      </div>
      {normalizedImages.length > 1 ? (
        <div
          className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6"
          aria-label="Product image thumbnails"
        >
          {normalizedImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-current={selectedIndex === index}
              className={`overflow-hidden rounded-[var(--radius-control)] border bg-[var(--surface)] transition-all ${
                selectedIndex === index
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/15'
                  : 'border-[var(--border)] opacity-75 hover:opacity-100'
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="relative block aspect-square">
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
