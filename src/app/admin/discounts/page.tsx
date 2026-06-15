import {formatMoney, type CurrencyCode} from '@/catalog/money';
import {requireAdmin} from '@/auth/guards';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {DisableDiscountCodeButton} from '@/components/admin/commerce/disable-discount-code-button';
import {DiscountCodeForm} from '@/components/admin/commerce/discount-code-form';
import {createSupabaseServerClient} from '@/lib/supabase/server';

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
  const minimum = formatMoney({amountMinor: discount.minimum_subtotal_minor, currencyCode: minimumCurrency});
  if (discount.discount_type === 'percentage') {
    return `${(discount.percentage_bps ?? 0) / 100}% off / ${market} / minimum ${minimum}`;
  }
  const amount = discount.currency_code
    ? formatMoney({amountMinor: discount.amount_minor ?? 0, currencyCode: discount.currency_code})
    : '-';
  return `${amount} off / ${market} / minimum ${minimum}`;
}

export default async function AdminDiscountsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase
    .from('discount_codes')
    .select('id,code,description,discount_type,percentage_bps,amount_minor,currency_code,market,minimum_subtotal_minor,usage_limit,used_count,active')
    .order('updated_at', {ascending: false});
  const discounts = (data ?? []) as DiscountRow[];

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin discounts</p>
          <h1 className="text-3xl font-semibold">Discount codes</h1>
        </div>
        {discounts.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-[var(--muted-foreground)]">No discount codes yet.</p>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => (
            <Card key={discount.id}>
              <CardHeader>
                <CardTitle>{discount.code}</CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">{discount.active ? 'Active' : 'Inactive'}</p>
              </CardHeader>
              <CardContent>
                {discount.description ? <p>{discount.description}</p> : null}
                <p className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
                  {discountPreview(discount)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Used {discount.used_count}
                  {discount.usage_limit ? ` / ${discount.usage_limit}` : ''}
                </p>
                <div className="mt-4">
                  <DisableDiscountCodeButton discountId={discount.id} code={discount.code} disabled={!discount.active} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create discount</CardTitle>
        </CardHeader>
        <CardContent>
          <DiscountCodeForm />
        </CardContent>
      </Card>
    </main>
  );
}
