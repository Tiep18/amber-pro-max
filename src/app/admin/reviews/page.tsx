import {requireAdmin} from '@/auth/guards';
import {ReviewModerationList} from '@/components/admin/reviews/review-moderation-list';
import {getAdminProductReviews, type ReviewStatus} from '@/reviews/queries';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{status?: string}>;

function reviewStatus(value: string | undefined): ReviewStatus | undefined {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'hidden' ? value : undefined;
}

export default async function AdminReviewsPage({searchParams}: {searchParams: SearchParams}) {
  await requireAdmin({next: '/admin/reviews'});
  const status = reviewStatus((await searchParams).status);
  const result = await getAdminProductReviews({status});

  return (
    <main className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin reviews</p>
        <h1 className="text-3xl font-semibold">Review moderation</h1>
      </div>
      {result.status === 'success' ? (
        <ReviewModerationList reviews={result.reviews} activeStatus={status} />
      ) : (
        <p role="alert" className="text-sm text-[var(--destructive)]">Review queue could not be loaded.</p>
      )}
    </main>
  );
}
