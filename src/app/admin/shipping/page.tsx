import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { ShippingCreateSheet } from '@/components/admin/commerce/shipping-create-sheet';
import {
  ShippingManagement,
  type AdminShippingProfile
} from '@/components/admin/commerce/shipping-management';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  const readClient = supabase as unknown as ShippingReadClient;
  const profileQuery = supabase
    .from('shipping_profiles')
    .select(
      'id,name,description,active,shipping_rules(id,profile_id,match_kind,country_code,currency_code,first_item_fee_minor,additional_item_fee_minor,active,shipping_region_adjustments(id,shipping_rule_id,country_code,region_code,mode,first_item_fee_minor,additional_item_fee_minor,active))'
    )
    .order('updated_at', { ascending: false }) as unknown as Promise<{
    data: Omit<AdminShippingProfile, 'assignmentCount' | 'isDefault'>[] | null;
    error: unknown;
  }>;
  const defaultQuery = readClient
    .from('shipping_store_defaults')
    .select('shipping_profile_id')
    .eq('active', true)
    .maybeSingle();

  const [
    { data, error: profileError },
    { data: defaultRow, error: defaultError },
    { data: productAssignments, error: productAssignmentError },
    { data: variantAssignments, error: variantAssignmentError }
  ] = await Promise.all([
    profileQuery,
    defaultQuery,
    supabase.from('product_shipping_profiles').select('profile_id'),
    supabase.from('variant_shipping_profiles').select('profile_id')
  ]);
  const loadError =
    profileError || defaultError || productAssignmentError || variantAssignmentError;
  const assignmentCounts = new Map<string, number>();
  for (const row of [...(productAssignments ?? []), ...(variantAssignments ?? [])]) {
    assignmentCounts.set(row.profile_id, (assignmentCounts.get(row.profile_id) ?? 0) + 1);
  }
  const profiles = (data ?? []).map((profile) => ({
    ...profile,
    assignmentCount: assignmentCounts.get(profile.id) ?? 0,
    isDefault: defaultRow?.shipping_profile_id === profile.id
  }));
  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin shipping"
        title="Shipping setup"
        description="Configure package types, destination fees, and US state surcharges."
        action={<ShippingCreateSheet />}
      />

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Shipping setup could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">Refresh the page or review sanitized operational errors.</p>
        </Alert>
      ) : null}
      <ShippingManagement profiles={profiles} />
    </AdminPageShell>
  );
}
