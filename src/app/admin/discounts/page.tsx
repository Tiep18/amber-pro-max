import { CircleCheck, ReceiptText, TicketPercent } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { DiscountCodeForm } from '@/components/admin/commerce/discount-code-form';
import { DiscountList, type AdminDiscount } from '@/components/admin/commerce/discount-list';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDiscountsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('discount_codes')
    .select(
      'id,code,description,discount_type,percentage_bps,amount_minor,currency_code,market,minimum_subtotal_minor,usage_limit,used_count,active'
    )
    .order('updated_at', { ascending: false });
  const discounts = (data ?? []) as AdminDiscount[];
  const activeCount = discounts.filter((discount) => discount.active).length;
  const usedCount = discounts.reduce((total, discount) => total + discount.used_count, 0);

  const metrics = [
    {
      label: 'Total codes',
      value: discounts.length,
      description: 'configured promotions',
      icon: TicketPercent
    },
    {
      label: 'Active',
      value: activeCount,
      description: 'available at checkout',
      icon: CircleCheck
    },
    {
      label: 'Redemptions',
      value: usedCount,
      description: 'all-time usage',
      icon: ReceiptText
    }
  ];

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin discounts"
        title="Discount codes"
        description="Create and monitor market-aware promotions."
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

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Discount codes could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">Refresh the page or review sanitized operational errors.</p>
        </Alert>
      ) : null}

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <DiscountList discounts={discounts} />

        <aside className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)] 2xl:sticky 2xl:top-20">
          <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/45 px-5 py-4">
            <h2 className="font-semibold">Create discount</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Build one controlled checkout rule at a time.
            </p>
          </div>
          <div className="p-5">
            <DiscountCodeForm />
          </div>
        </aside>
      </div>
    </AdminPageShell>
  );
}
