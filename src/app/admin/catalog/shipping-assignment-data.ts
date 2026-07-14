import 'server-only';

import type {
  ShippingAssignmentProfile,
  ShippingProfileOption
} from '@/components/admin/commerce/shipping-assignment-sheet';
import {assertCatalogAdminQueryResults} from '@/catalog/admin-query-results';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ProductAssignmentRow = {
  profile_id: string;
} | null;

type VariantAssignmentRow = {
  variant_id: string;
  profile_id: string;
};

type StoreDefaultRow = {
  shipping_profile_id: string;
} | null;

type StoreDefaultReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: unknown
      ) => {
        maybeSingle: () => Promise<{ data: StoreDefaultRow; error: unknown }>;
      };
    };
  };
};

export type ProductShippingAssignment = {
  explicitProfileId: string | null;
  effectiveProfile: ShippingAssignmentProfile | null;
  effectiveSource: 'Product' | 'Store default';
};

export type VariantShippingAssignment = {
  variantId: string;
  explicitProfileId: string | null;
};

function toProfileMap(profiles: ShippingProfileOption[]) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export async function getCatalogShippingAssignmentData(productId: string, variantIds: string[] = []) {
  const supabase = await createSupabaseServerClient();
  const [profileResult, productAssignmentResult, defaultResult, variantAssignmentResult] =
    await Promise.all([
      supabase
        .from('shipping_profiles')
        .select('id,name')
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('product_shipping_profiles')
        .select('profile_id')
        .eq('product_id', productId)
        .maybeSingle(),
      (supabase as unknown as StoreDefaultReadClient)
        .from('shipping_store_defaults')
        .select('shipping_profile_id')
        .eq('active', true)
        .maybeSingle(),
      variantIds.length
        ? supabase
            .from('variant_shipping_profiles')
            .select('variant_id,profile_id')
            .in('variant_id', variantIds)
        : Promise.resolve({ data: [] as VariantAssignmentRow[], error: null })
    ]);

  await assertCatalogAdminQueryResults(
    [profileResult, productAssignmentResult, defaultResult, variantAssignmentResult],
    {action: 'catalog_shipping_assignments', productId}
  );

  const profiles: ShippingProfileOption[] = (profileResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name
  }));
  const profileMap = toProfileMap(profiles);
  const productRow = productAssignmentResult.data as ProductAssignmentRow;
  const defaultRow = defaultResult.data as StoreDefaultRow;
  const explicitProductProfile = productRow?.profile_id
    ? (profileMap.get(productRow.profile_id) ?? null)
    : null;
  const defaultProfile = defaultRow?.shipping_profile_id
    ? (profileMap.get(defaultRow.shipping_profile_id) ?? null)
    : null;

  const productAssignment: ProductShippingAssignment = {
    explicitProfileId: explicitProductProfile?.id ?? null,
    effectiveProfile: explicitProductProfile ?? defaultProfile,
    effectiveSource: explicitProductProfile ? 'Product' : 'Store default'
  };

  const variantAssignments: VariantShippingAssignment[] = (
    (variantAssignmentResult.data ?? []) as VariantAssignmentRow[]
  ).map((row) => ({
    variantId: row.variant_id,
    explicitProfileId: profileMap.has(row.profile_id) ? row.profile_id : null
  }));

  return {
    profiles,
    storeDefaultProfile: defaultProfile,
    productAssignment,
    variantAssignments
  };
}
