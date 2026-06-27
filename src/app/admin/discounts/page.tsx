import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { requireAdmin } from '@/auth/guards';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill
} from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DisableDiscountCodeButton } from '@/components/admin/commerce/disable-discount-code-button';
import { DiscountCodeForm } from '@/components/admin/commerce/discount-code-form';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DiscountRow = {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  percentage_bps: number | null;
  amount_minor: number | null;
  currency_code: CurrencyCode | null;
  market: 'vn' | 'intl' | null;
  minimum_subtotal_minor: number;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
};

function discountPreview(discount: DiscountRow) {
  const market = discount.market ?? 'all markets';
  const minimumCurrency = discount.currency_code ?? (discount.market === 'vn' ? 'VND' : 'USD');
  const minimum = formatMoney({
    amountMinor: discount.minimum_subtotal_minor,
    currencyCode: minimumCurrency
  });
  if (discount.discount_type === 'percentage') {
    return `${(discount.percentage_bps ?? 0) / 100}% off / ${market} / minimum ${minimum}`;
  }
  const amount = discount.currency_code
    ? formatMoney({ amountMinor: discount.amount_minor ?? 0, currencyCode: discount.currency_code })
    : '-';
  return `${amount} off / ${market} / minimum ${minimum}`;
}

export default async function AdminDiscountsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('discount_codes')
    .select(
      'id,code,description,discount_type,percentage_bps,amount_minor,currency_code,market,minimum_subtotal_minor,usage_limit,used_count,active'
    )
    .order('updated_at', { ascending: false });
  const discounts = (data ?? []) as DiscountRow[];
  const activeCount = discounts.filter((discount) => discount.active).length;
  const usedCount = discounts.reduce((total, discount) => total + discount.used_count, 0);

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin discounts"
        title="Discount codes"
        description="Create and monitor market-aware promotion codes without changing checkout pricing logic."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Total codes"
          value={discounts.length}
          description="configured promotions"
        />
        <AdminMetricCard label="Active" value={activeCount} description="currently usable" />
        <AdminMetricCard label="Redemptions" value={usedCount} description="all-time usage" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden p-0">
          <CardHeader className="m-0 border-b border-[var(--border)] p-6">
            <CardTitle>Promotion queue</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Review status, market, minimum spend, and usage limits.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {discounts.length === 0 ? (
              <AdminEmptyState
                title="No discount codes yet."
                description="Create a code when you are ready to run a promotion."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-6 py-3">Code</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {discounts.map((discount) => (
                      <tr
                        key={discount.id}
                        className="transition-colors hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{discount.code}</p>
                            <AdminStatusPill tone={discount.active ? 'success' : 'default'}>
                              {discount.active ? 'Active' : 'Inactive'}
                            </AdminStatusPill>
                          </div>
                          {discount.description ? (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {discount.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top text-[var(--muted-foreground)]">
                          {discountPreview(discount)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="font-semibold tabular-nums">{discount.used_count}</span>
                          {discount.usage_limit ? (
                            <span className="text-[var(--muted-foreground)]">
                              {' '}
                              / {discount.usage_limit}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          <DisableDiscountCodeButton
                            discountId={discount.id}
                            code={discount.code}
                            disabled={!discount.active}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create discount</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Add a controlled code for one or both markets.
            </p>
          </CardHeader>
          <CardContent>
            <DiscountCodeForm />
          </CardContent>
        </Card>
      </section>
    </AdminPageShell>
  );
}
