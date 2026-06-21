import type {PublicProductReview} from '@/reviews/eligibility';

export function ProductReviews({
  reviews,
  labels
}: {
  reviews: PublicProductReview[];
  labels: {
    title: string;
    empty: string;
    verifiedPurchase: string;
    ratingLabel: string;
    shopReply: string;
  };
}) {
  return (
    <section className="grid gap-4 border-t border-[var(--border)] pt-6">
      <h2 className="text-2xl font-semibold leading-tight">{labels.title}</h2>
      {reviews.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">{labels.empty}</p>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <article key={`${review.productId}-${review.approvedAt}-${review.maskedAuthor}`} className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{review.maskedAuthor}</p>
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
                  {labels.verifiedPurchase}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold" aria-label={`${labels.ratingLabel}: ${review.rating}`}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </p>
              {review.title ? <h3 className="mt-3 text-lg font-semibold">{review.title}</h3> : null}
              {review.body ? <p className="mt-2 text-[var(--muted-foreground)]">{review.body}</p> : null}
              {review.shopReplyBody ? (
                <div className="ml-3 mt-4 border-l-2 border-[var(--accent)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-sm font-semibold">{labels.shopReply}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.shopReplyBody}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
