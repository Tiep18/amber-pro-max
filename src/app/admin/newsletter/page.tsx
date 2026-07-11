import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { SubscriberList } from '@/components/admin/newsletter/subscriber-list';
import {
  createAdminNewsletterQueryClient,
  getAdminNewsletterSubscribers,
  type AdminNewsletterFilters
} from '@/newsletter/admin-queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function parseFilters(
  searchParams: PageProps['searchParams']
): Promise<AdminNewsletterFilters> {
  const params = await searchParams;
  return {
    status: single(params?.status) as AdminNewsletterFilters['status'],
    locale: single(params?.locale) as AdminNewsletterFilters['locale'],
    market: single(params?.market) as AdminNewsletterFilters['market'],
    search: single(params?.search)
  };
}

export default async function AdminNewsletterPage({ searchParams }: PageProps) {
  await requireAdmin({ next: '/admin/newsletter' });
  const client = await createAdminNewsletterQueryClient();
  const result = await getAdminNewsletterSubscribers({
    client,
    requireAdmin: async () => true,
    filters: await parseFilters(searchParams)
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin newsletter"
        title="Newsletter subscribers"
        description="Inspect consented audiences and minimized evidence."
      />
      {result.status === 'success' ? (
        <SubscriberList subscribers={result.subscribers} filters={result.filters} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Newsletter subscribers could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">
            Refresh the page or inspect server logs with sensitive data redacted.
          </p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
