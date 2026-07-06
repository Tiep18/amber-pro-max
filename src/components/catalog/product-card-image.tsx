'use client';

import { useState } from 'react';
import Image from 'next/image';

export function ProductCardImage({
  src,
  alt,
  sizes,
  eager = false,
  fallbackBrand,
  fallbackStatus
}: {
  src: string | null;
  alt: string;
  sizes: string;
  eager?: boolean;
  fallbackBrand: string;
  fallbackStatus: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--surface-muted),#f7f4ef)] px-4 text-center text-sm text-[var(--muted-foreground)]">
        <span className="grid gap-1">
          <span className="font-semibold text-[var(--brand)]">{fallbackBrand}</span>
          <span>{fallbackStatus}</span>
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      onError={() => setFailed(true)}
      className="object-cover transition duration-700 group-hover:scale-[1.035]"
    />
  );
}
