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
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DeactivateShippingProfileButton } from '@/components/admin/commerce/deactivate-shipping-profile-button';
import { ShippingProfileForm } from '@/components/admin/commerce/shipping-profile-form';

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
  const { data } = await supabase
    .from('shipping_profiles')
    .select(
      'id,name,description,active,shipping_rules(id,country_code,currency_code,first_item_fee_minor,additional_item_fee_minor,active)'
    )
    .order('updated_at', { ascending: false });
  const profiles = data ?? [];
  const activeProfiles = profiles.filter((profile) => profile.active).length;
  const ruleCount = profiles.reduce(
    (total, profile) => total + (profile.shipping_rules?.length ?? 0),
    0
  );

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin shipping"
        title="Shipping profiles"
        description="Configure manual shipping fee profiles for physical products by country and currency."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Profiles" value={profiles.length} description="configured groups" />
        <AdminMetricCard
          label="Active profiles"
          value={activeProfiles}
          description="available to checkout"
        />
        <AdminMetricCard label="Rules" value={ruleCount} description="country fee rows" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden p-0">
          <CardHeader className="m-0 border-b border-[var(--border)] p-6">
            <CardTitle>Shipping profile queue</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Scan active profiles and the fee rules currently attached to them.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {profiles.length === 0 ? (
              <AdminEmptyState
                title="No shipping profiles yet."
                description="Create a profile before enabling physical checkout destinations."
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {profiles.map((profile) => (
                  <section
                    key={profile.id}
                    className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{profile.name}</h2>
                        <AdminStatusPill tone={profile.active ? 'success' : 'default'}>
                          {profile.active ? 'Active' : 'Inactive'}
                        </AdminStatusPill>
                      </div>
                      {profile.description ? (
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {profile.description}
                        </p>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {((profile.shipping_rules ?? []) as ShippingRuleRow[]).map((rule) => (
                          <div
                            key={rule.id}
                            className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{rule.country_code}</span>
                              <AdminStatusPill tone={rule.active ? 'success' : 'default'}>
                                {rule.active ? 'Active' : 'Inactive'}
                              </AdminStatusPill>
                            </div>
                            <p className="mt-1 text-[var(--muted-foreground)]">
                              {rule.currency_code} / first{' '}
                              {formatMoney({
                                amountMinor: rule.first_item_fee_minor,
                                currencyCode: rule.currency_code
                              })}{' '}
                              / additional{' '}
                              {formatMoney({
                                amountMinor: rule.additional_item_fee_minor,
                                currencyCode: rule.currency_code
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <DeactivateShippingProfileButton
                        profileId={profile.id}
                        profileName={profile.name}
                        disabled={!profile.active}
                      />
                    </div>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create profile</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Add a manual shipping fee profile for physical fulfillment.
            </p>
          </CardHeader>
          <CardContent>
            <ShippingProfileForm />
          </CardContent>
        </Card>
      </section>
    </AdminPageShell>
  );
}
