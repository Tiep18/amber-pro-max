import { CircleCheck, Clock3, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { maskEmail } from '@/checkout/exceptions';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import {
  ExceptionRequestList,
  type AdminExceptionRequest
} from '@/components/admin/commerce/exception-request-list';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

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

type UntypedSupabaseClient = { from: (table: string) => QueryBuilder };

export default async function AdminExceptionsPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient()) as unknown as UntypedSupabaseClient;
  const { data } = await supabase
    .from('market_exception_requests')
    .select(
      'id,status,contact_email,product_id,variant_id,market,destination_country_code,customer_note,created_at'
    )
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as ExceptionRequestRow[];
  const requests: AdminExceptionRequest[] = rows.map((request) => ({
    id: request.id,
    status: request.status,
    maskedEmail: maskEmail(request.contact_email),
    productId: request.product_id,
    variantId: request.variant_id,
    market: request.market,
    destinationCountryCode: request.destination_country_code,
    customerNote: request.customer_note,
    createdAt: request.created_at
  }));
  const metrics = [
    {
      label: 'Requests',
      value: requests.length,
      description: 'total submitted',
      icon: ShieldCheck
    },
    {
      label: 'Pending',
      value: requests.filter((request) => request.status === 'pending').length,
      description: 'needs decision',
      icon: Clock3
    },
    {
      label: 'Approved',
      value: requests.filter((request) => request.status === 'approved').length,
      description: 'grants issued',
      icon: CircleCheck
    }
  ];

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin exceptions"
        title="Market exception requests"
        description="Review unavailable-market access requests."
      />
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>
      <ExceptionRequestList requests={requests} />
    </AdminPageShell>
  );
}
