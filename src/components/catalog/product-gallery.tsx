export function ProductGallery({
  imageUrl,
  alt
}: {
  imageUrl: string | null;
  alt: string;
}) {
  return (
    <section aria-label={alt} className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)]">
      <div className="aspect-square">
        {imageUrl ? <img src={imageUrl} alt={alt} className="h-full w-full object-cover" /> : null}
      </div>
    </section>
  );
}
