import {requireAdmin} from '@/auth/guards';
import {SubscriberList} from '@/components/admin/newsletter/subscriber-list';
import {createAdminNewsletterQueryClient, getAdminNewsletterSubscribers, type AdminNewsletterFilters} from '@/newsletter/admin-queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function parseFilters(searchParams: PageProps['searchParams']): Promise<AdminNewsletterFilters> {
  const params = await searchParams;
  return {
    status: single(params?.status) as AdminNewsletterFilters['status'],
    locale: single(params?.locale) as AdminNewsletterFilters['locale'],
    market: single(params?.market) as AdminNewsletterFilters['market'],
    search: single(params?.search)
  };
}

export default async function AdminNewsletterPage({searchParams}: PageProps) {
  await requireAdmin({next: '/admin/newsletter'});
  const client = await createAdminNewsletterQueryClient();
  const result = await getAdminNewsletterSubscribers({
    client,
    requireAdmin: async () => true,
    filters: await parseFilters(searchParams)
  });

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin newsletter</p>
        <h1 className="text-3xl font-semibold">Newsletter subscribers</h1>
      </div>
      {result.status === 'success' ? (
        <SubscriberList subscribers={result.subscribers} filters={result.filters} />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Newsletter subscribers could not be loaded.
        </p>
      )}
    </main>
  );
}
