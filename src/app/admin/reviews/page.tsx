import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ReviewModerationList } from '@/components/admin/reviews/review-moderation-list';
import { getAdminProductReviews, type ReviewStatus } from '@/reviews/queries';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string; page?: string }>;

function reviewStatus(value: string | undefined): ReviewStatus | undefined {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'hidden'
    ? value
    : undefined;
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin({ next: '/admin/reviews' });
  const params = await searchParams;
  const status = reviewStatus(params.status);
  const requestedPage = Number(params.page ?? '1');
  const result = await getAdminProductReviews({});

  const pageSize = 10;
  const allReviews = result.status === 'success' ? result.reviews : [];
  const filteredReviews = status
    ? allReviews.filter((review) => review.status === status)
    : allReviews;
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const reviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin reviews"
        title="Review moderation"
        description="Approve, hide, reject, or reply to customer reviews before they affect storefront trust."
      />
      {result.status === 'success' ? (
        <ReviewModerationList
          reviews={reviews}
          allReviews={allReviews}
          activeStatus={status}
          pagination={{ page, pageSize, totalCount: filteredReviews.length, totalPages }}
        />
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
