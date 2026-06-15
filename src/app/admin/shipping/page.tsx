import {formatMoney, type CurrencyCode} from '@/catalog/money';
import {requireAdmin} from '@/auth/guards';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {DeactivateShippingProfileButton} from '@/components/admin/commerce/deactivate-shipping-profile-button';
import {ShippingProfileForm} from '@/components/admin/commerce/shipping-profile-form';

export const dynamic = 'force-dynamic';

type ShippingRuleRow = {
  id: string;
  country_code: string;
  currency_code: CurrencyCode;
  first_item_fee_minor: number;
  additional_item_fee_minor: number;
  active: boolean;
};

export default async function AdminShippingPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase
    .from('shipping_profiles')
    .select('id,name,description,active,shipping_rules(id,country_code,currency_code,first_item_fee_minor,additional_item_fee_minor,active)')
    .order('updated_at', {ascending: false});
  const profiles = data ?? [];

  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin shipping</p>
          <h1 className="text-3xl font-semibold">Shipping profiles</h1>
        </div>
        {profiles.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-[var(--muted-foreground)]">No shipping profiles yet.</p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <CardTitle>{profile.name}</CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">{profile.active ? 'Active' : 'Inactive'}</p>
              </CardHeader>
              <CardContent>
                {profile.description ? <p>{profile.description}</p> : null}
                <div className="grid gap-2">
                  {((profile.shipping_rules ?? []) as ShippingRuleRow[]).map((rule) => (
                    <p key={rule.id} className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
                      {rule.country_code} / {rule.currency_code} / first{' '}
                      {formatMoney({amountMinor: rule.first_item_fee_minor, currencyCode: rule.currency_code})} / additional{' '}
                      {formatMoney({amountMinor: rule.additional_item_fee_minor, currencyCode: rule.currency_code})}
                      {rule.active ? '' : ' / inactive'}
                    </p>
                  ))}
                </div>
                <div className="mt-4">
                  <DeactivateShippingProfileButton profileId={profile.id} profileName={profile.name} disabled={!profile.active} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ShippingProfileForm />
        </CardContent>
      </Card>
    </main>
  );
}
