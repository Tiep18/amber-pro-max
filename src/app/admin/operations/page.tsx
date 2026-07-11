import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ErrorQueue } from '@/components/admin/operations/error-queue';
import {
  createAdminOperationalErrorsQueryClient,
  getAdminOperationalErrors,
  type AdminOperationalErrorFilters
} from '@/operations/admin-queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function parseFilters(
  searchParams: PageProps['searchParams']
): Promise<AdminOperationalErrorFilters> {
  const params = await searchParams;
  return {
    status: single(params?.status) as AdminOperationalErrorFilters['status'],
    area: single(params?.area) as AdminOperationalErrorFilters['area'],
    page: Number(single(params?.page) ?? '1')
  };
}

export default async function AdminOperationsPage({ searchParams }: PageProps) {
  await requireAdmin({ next: '/admin/operations' });
  const client = await createAdminOperationalErrorsQueryClient();
  const result = await getAdminOperationalErrors({
    client,
    requireAdmin: async () => true,
    filters: await parseFilters(searchParams)
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin operations"
        title="Operational errors"
        description="Review sanitized system errors and resolve operational incidents."
      />
      {result.status === 'success' ? (
        <ErrorQueue
          errors={result.errors}
          filters={result.filters}
          pagination={result.pagination}
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Operational errors could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">
            Refresh the page or check server logs with sensitive data redacted.
          </p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
