import {requireAdmin} from '@/auth/guards';
import {maskEmail} from '@/checkout/exceptions';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ExceptionReview} from '@/components/admin/commerce/exception-review';

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
  order: (column: string, options: {ascending: boolean}) => Promise<{data: unknown[] | null}>;
};

type UntypedSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

export default async function AdminExceptionsPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient()) as unknown as UntypedSupabaseClient;
  const {data} = await supabase
    .from('market_exception_requests')
    .select('id,status,contact_email,product_id,variant_id,market,destination_country_code,customer_note,created_at')
    .order('created_at', {ascending: false});
  const requests = (data ?? []) as unknown as ExceptionRequestRow[];

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-4 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin exceptions</p>
        <h1 className="text-3xl font-semibold">Market exception requests</h1>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent>No exception requests yet.</CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle>{maskEmail(request.contact_email)}</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">{request.status}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {request.market.toUpperCase()} / {request.destination_country_code} / {request.product_id}
                {request.variant_id ? ` / ${request.variant_id}` : ''}
              </p>
              {request.customer_note ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{request.customer_note}</p> : null}
              {request.status === 'pending' ? <div className="mt-4"><ExceptionReview requestId={request.id} /></div> : null}
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
