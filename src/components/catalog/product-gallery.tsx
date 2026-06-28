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
      <div className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)]">
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
          ) : null}
        </div>
      </div>
      {normalizedImages.length > 1 ? (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-5"
          aria-label="Product image thumbnails"
        >
          {normalizedImages.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-current={selectedIndex === index}
              className={`overflow-hidden rounded-[var(--radius-control)] border bg-[var(--surface)] ${
                selectedIndex === index
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
                  : 'border-[var(--border)]'
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
