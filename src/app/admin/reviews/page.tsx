import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ReviewModerationList } from '@/components/admin/reviews/review-moderation-list';
import { getAdminProductReviews, type ReviewStatus } from '@/reviews/queries';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string }>;

function reviewStatus(value: string | undefined): ReviewStatus | undefined {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'hidden'
    ? value
    : undefined;
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin({ next: '/admin/reviews' });
  const status = reviewStatus((await searchParams).status);
  const result = await getAdminProductReviews({ status });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin reviews"
        title="Review moderation"
        description="Approve, hide, reject, or reply to customer reviews before they affect storefront trust."
      />
      {result.status === 'success' ? (
        <ReviewModerationList reviews={result.reviews} activeStatus={status} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Review queue could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">
            Refresh the page or inspect server logs with sensitive data redacted.
          </p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
