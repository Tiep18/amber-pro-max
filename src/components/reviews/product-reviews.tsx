import type {PublicProductReview} from '@/reviews/eligibility';

function reviewAverage(reviews: PublicProductReview[]) {
  if (!reviews.length) {
    return 0;
  }
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function ratingCounts(reviews: PublicProductReview[]) {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length
  }));
}

function formatDate(value: string, locale: 'vi' | 'en') {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function ProductReviews({
  reviews,
  locale,
  labels
}: {
  reviews: PublicProductReview[];
  locale: 'vi' | 'en';
  labels: {
    title: string;
    empty: string;
    verifiedPurchase: string;
    ratingLabel: string;
    shopReply: string;
  };
}) {
  const average = reviewAverage(reviews);
  const counts = ratingCounts(reviews);
  const maxCount = Math.max(...counts.map((item) => item.count), 1);
  const reviewCountLabel = locale === 'vi' ? 'danh gia' : 'reviews';
  const emptyDetail =
    locale === 'vi'
      ? 'Khach da mua co the gui cam nhan sau don hang. Cac danh gia duoc duyet se hien tai day.'
      : 'Verified buyers can share notes after purchase. Approved reviews will appear here.';

  return (
    <section className="grid gap-5 border-t border-[var(--border)] pt-8 lg:pt-10">
      <h2 className="text-xl font-semibold leading-tight">{labels.title}</h2>
      {reviews.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <p className="font-semibold">{labels.empty}</p>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            {emptyDetail}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_14px_42px_rgba(91,55,35,0.06)] sm:grid-cols-[160px_1fr]">
            <div>
              <p className="text-3xl font-semibold leading-none tabular-nums">{average.toFixed(1)}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--warning)]" aria-label={`${labels.ratingLabel}: ${average.toFixed(1)}`}>
                {'★'.repeat(Math.round(average))}{'☆'.repeat(5 - Math.round(average))}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{reviews.length} {reviewCountLabel}</p>
            </div>
            <div className="grid gap-2">
              {counts.map((item) => (
                <div key={item.rating} className="grid grid-cols-[42px_1fr_28px] items-center gap-3 text-sm">
                  <span>{item.rating} {locale === 'vi' ? 'sao' : 'star'}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <span
                      className="block h-full rounded-full bg-[var(--accent)]"
                      style={{width: `${(item.count / maxCount) * 100}%`}}
                    />
                  </span>
                  <span className="text-right text-[var(--muted-foreground)]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          {reviews.map((review) => (
            <article key={`${review.productId}-${review.approvedAt}-${review.maskedAuthor}`} className="border-t border-[var(--border)] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-sm font-semibold">
                    {review.maskedAuthor.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold">{review.maskedAuthor}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(review.approvedAt, locale)}</p>
                  </div>
                </div>
                <span className="rounded-[var(--radius-control)] bg-[var(--trust-surface)] px-2 py-1 text-xs font-semibold text-[var(--trust-accent)]">
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
