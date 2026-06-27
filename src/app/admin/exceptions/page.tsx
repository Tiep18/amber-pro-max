import { requireAdmin } from '@/auth/guards';
import { maskEmail } from '@/checkout/exceptions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill
} from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExceptionReview } from '@/components/admin/commerce/exception-review';

export const dynamic = 'force-dynamic';

type ExceptionRequestRow = {
  id: string;
  status: string;
  contact_email: string;
  product_id: string;
  variant_id: string | null;
  market: string;
  destination_country_code: string;
  customer_note: string;
  created_at: string;
};

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown[] | null }>;
};

type UntypedSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

export default async function AdminExceptionsPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient()) as unknown as UntypedSupabaseClient;
  const { data } = await supabase
    .from('market_exception_requests')
    .select(
      'id,status,contact_email,product_id,variant_id,market,destination_country_code,customer_note,created_at'
    )
    .order('created_at', { ascending: false });
  const requests = (data ?? []) as unknown as ExceptionRequestRow[];
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const approvedCount = requests.filter((request) => request.status === 'approved').length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin exceptions"
        title="Market exception requests"
        description="Review customer requests for products that are unavailable in their current market or destination."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Requests" value={requests.length} description="total submitted" />
        <AdminMetricCard label="Pending" value={pendingCount} description="needs decision" />
        <AdminMetricCard label="Approved" value={approvedCount} description="grants issued" />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-6">
          <CardTitle>Exception review queue</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Customer email is masked; product and market facts stay visible for review.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <AdminEmptyState
              title="No exception requests yet."
              description="Requests will appear here when customers ask for unavailable market access."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {requests.map((request) => (
                <section
                  key={request.id}
                  className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{maskEmail(request.contact_email)}</h2>
                      <AdminStatusPill
                        tone={
                          request.status === 'pending'
                            ? 'warning'
                            : request.status === 'approved'
                              ? 'success'
                              : 'default'
                        }
                      >
                        {request.status}
                      </AdminStatusPill>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {request.market.toUpperCase()} / {request.destination_country_code} /{' '}
                      {request.product_id}
                      {request.variant_id ? ` / ${request.variant_id}` : ''}
                    </p>
                    {request.customer_note ? (
                      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                        {request.customer_note}
                      </p>
                    ) : null}
                  </div>
                  {request.status === 'pending' ? (
                    <div className="flex items-start">
                      <ExceptionReview requestId={request.id} />
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
