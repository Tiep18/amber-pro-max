import {requireAdmin} from '@/auth/guards';
import {ErrorQueue} from '@/components/admin/operations/error-queue';
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

async function parseFilters(searchParams: PageProps['searchParams']): Promise<AdminOperationalErrorFilters> {
  const params = await searchParams;
  return {
    status: single(params?.status) as AdminOperationalErrorFilters['status'],
    area: single(params?.area) as AdminOperationalErrorFilters['area']
  };
}

export default async function AdminOperationsPage({searchParams}: PageProps) {
  await requireAdmin({next: '/admin/operations'});
  const client = await createAdminOperationalErrorsQueryClient();
  const result = await getAdminOperationalErrors({
    client,
    requireAdmin: async () => true,
    filters: await parseFilters(searchParams)
  });

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin operations</p>
        <h1 className="text-3xl font-semibold">Operational errors</h1>
      </div>
      {result.status === 'success' ? (
        <ErrorQueue errors={result.errors} filters={result.filters} />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Operational errors could not be loaded. Refresh the page or check server logs with sensitive data redacted.
        </p>
      )}
    </main>
  );
}
