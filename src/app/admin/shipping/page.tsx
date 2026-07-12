import { CircleCheck, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { ShippingCreateSheet } from '@/components/admin/commerce/shipping-create-sheet';
import {
  ShippingManagement,
  type AdminShippingProfile
} from '@/components/admin/commerce/shipping-management';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type ShippingDefaultRow = {
  shipping_profile_id: string;
} | null;

type ShippingReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: unknown
      ) => {
        maybeSingle: () => Promise<{ data: ShippingDefaultRow; error: unknown }>;
      };
    };
  };
};

export default async function AdminShippingPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = (await supabase
    .from('shipping_profiles')
    .select(
      'id,name,description,active,shipping_rules(id,profile_id,match_kind,country_code,currency_code,first_item_fee_minor,additional_item_fee_minor,active,shipping_region_adjustments(id,shipping_rule_id,country_code,region_code,mode,first_item_fee_minor,additional_item_fee_minor,active))'
    )
    .order('updated_at', { ascending: false })) as {
    data: Omit<AdminShippingProfile, 'assignmentCount' | 'isDefault'>[] | null;
    error: unknown;
  };
  const readClient = supabase as unknown as ShippingReadClient;
  const { data: defaultRow } = await readClient
    .from('shipping_store_defaults')
    .select('shipping_profile_id')
    .eq('active', true)
    .maybeSingle();
  const [{ data: productAssignments }, { data: variantAssignments }] = await Promise.all([
    supabase.from('product_shipping_profiles').select('profile_id'),
    supabase.from('variant_shipping_profiles').select('profile_id')
  ]);
  const assignmentCounts = new Map<string, number>();
  for (const row of [...(productAssignments ?? []), ...(variantAssignments ?? [])]) {
    assignmentCounts.set(row.profile_id, (assignmentCounts.get(row.profile_id) ?? 0) + 1);
  }
  const profiles = (data ?? []).map((profile) => ({
    ...profile,
    assignmentCount: assignmentCounts.get(profile.id) ?? 0,
    isDefault: defaultRow?.shipping_profile_id === profile.id
  }));
  const activeProfiles = profiles.filter((profile) => profile.active).length;
  const ruleCount = profiles.reduce(
    (total, profile) => total + (profile.shipping_rules?.length ?? 0),
    0
  );
  const adjustmentCount = profiles.reduce(
    (total, profile) =>
      total +
      (profile.shipping_rules ?? []).reduce(
        (ruleTotal, rule) => ruleTotal + (rule.shipping_region_adjustments?.length ?? 0),
        0
      ),
    0
  );
  const metrics = [
    { label: 'Profiles', value: profiles.length, description: 'configured groups', icon: Truck },
    {
      label: 'Active',
      value: activeProfiles,
      description: 'available at checkout',
      icon: CircleCheck
    },
    { label: 'Rules', value: ruleCount, description: 'destination rows', icon: MapPin },
    {
      label: 'US adjustments',
      value: adjustmentCount,
      description: 'regional overrides',
      icon: ShieldCheck
    }
  ];

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin shipping"
        title="Shipping profiles"
        description="Configure parcel defaults, destination fees, and US regional adjustments."
        action={<ShippingCreateSheet />}
      />

      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0',
                index === 2 && 'sm:border-l-0 xl:border-l'
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
          <AlertTitle>Shipping profiles could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">Refresh the page or review sanitized operational errors.</p>
        </Alert>
      ) : null}
      <ShippingManagement profiles={profiles} />
    </AdminPageShell>
  );
}
