'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';
import {invalidateCatalogCache} from '@/lib/cache-invalidation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import type {Json} from '@/types/supabase';
import {
  inventoryAdjustmentSchema,
  removeVariantPriceOverrideSchema,
  removeVariantSchema,
  variantDraftSchema,
  variantPriceOverrideSchema,
  type InventoryAdjustmentInput,
  type RemoveVariantInput,
  type RemoveVariantPriceOverrideInput,
  type VariantDraftInput,
  type VariantPriceOverrideInput
} from './variant-schemas';

type VariantActionCode =
  | 'invalid_input'
  | 'product_not_found'
  | 'variant_not_found'
  | 'not_physical_product'
  | 'duplicate_sku'
  | 'wrong_inventory_owner'
  | 'save_failed'
  | 'remove_failed';

export type VariantActionResult =
  | {status: 'success'; message: string}
  | {status: 'invalid'; code: VariantActionCode}
  | {status: 'error'; code: VariantActionCode};

const variantShippingProfileSchema = z.object({
  variantId: z.uuid(),
  shippingProfileId: z.union([z.uuid(), z.literal('store_default')])
}).strict();

export type VariantShippingProfileResult =
  | {status: 'saved'}
  | {status: 'invalid'; code: 'invalid_shipping_assignment' | 'inactive_shipping_profile' | 'variant_not_found'}
  | {status: 'error'; code: 'shipping_assignment_failed'};

function revalidateVariants(productId: string) {
  revalidatePath(`/admin/catalog/${productId}`);
  revalidatePath(`/admin/catalog/${productId}/variants`);
  invalidateCatalogCache();
}

function databaseCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

async function monitoredVariantFailure({
  action,
  productId,
  referenceId,
  code,
  summary
}: {
  action:
    | 'variant_save'
    | 'variant_remove'
    | 'variant_price_override_save'
    | 'variant_price_override_remove'
    | 'inventory_adjust';
  productId?: string | null;
  referenceId?: string | null;
  code: 'save_failed' | 'remove_failed';
  summary: string;
}): Promise<VariantActionResult> {
  return runMonitoredAction({
    area: 'admin',
    action,
    errorCode: `catalog_${action}_failed`,
    summary,
    errorResult: {status: 'error', code} as const,
    shouldRecordResult: () => true,
    facts: {
      productId: productId ?? null,
      referenceId: referenceId ?? null
    },
    operation: async () => ({status: 'error', code}) as const
  });
}

async function mapWriteError(
  error: unknown,
  context: {
    action: Parameters<typeof monitoredVariantFailure>[0]['action'];
    productId?: string | null;
    referenceId?: string | null;
    summary: string;
  }
): Promise<VariantActionResult> {
  const code = databaseCode(error);
  if (code === '23505') {
    return {status: 'invalid', code: 'duplicate_sku'};
  }
  if (code === '23514') {
    return {status: 'invalid', code: 'wrong_inventory_owner'};
  }
  return monitoredVariantFailure({
    action: context.action,
    productId: context.productId,
    referenceId: context.referenceId,
    code: 'save_failed',
    summary: context.summary
  });
}

async function productType(productId: string) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.from('products').select('id, product_type').eq('id', productId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data.product_type;
}

async function variantProductId(variantId: string) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.from('product_variants').select('id, product_id').eq('id', variantId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data.product_id;
}

async function productHasVariants(productId: string) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function saveVariantAction(input: VariantDraftInput): Promise<VariantActionResult> {
  await requireAdmin();
  const parsed = variantDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const ownerType = await productType(parsed.data.productId);
  if (!ownerType) {
    return {status: 'invalid', code: 'product_not_found'};
  }
  if (ownerType !== 'physical_finished') {
    return {status: 'invalid', code: 'not_physical_product'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.from('product_variants').upsert(
    {
      id: parsed.data.variantId,
      product_id: parsed.data.productId,
      sku: parsed.data.sku,
      attributes: parsed.data.attributes as Json,
      display_order: parsed.data.displayOrder,
      media_id: parsed.data.mediaId,
      updated_at: new Date().toISOString()
    },
    {onConflict: 'id'}
  );
  if (error) {
    return mapWriteError(error, {
      action: 'variant_save',
      productId: parsed.data.productId,
      referenceId: parsed.data.variantId,
      summary: 'Catalog variant save failed'
    });
  }

  revalidateVariants(parsed.data.productId);
  return {status: 'success', message: 'Variant saved'};
}

export async function removeVariantAction(input: RemoveVariantInput): Promise<VariantActionResult> {
  await requireAdmin();
  const parsed = removeVariantSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('product_variants')
    .delete()
    .eq('id', parsed.data.variantId)
    .eq('product_id', parsed.data.productId);
  if (error) {
    return monitoredVariantFailure({
      action: 'variant_remove',
      productId: parsed.data.productId,
      referenceId: parsed.data.variantId,
      code: 'remove_failed',
      summary: 'Catalog variant remove failed'
    });
  }

  revalidateVariants(parsed.data.productId);
  return {status: 'success', message: 'Variant removed'};
}

export async function saveVariantPriceOverrideAction(input: VariantPriceOverrideInput): Promise<VariantActionResult> {
  await requireAdmin();
  const parsed = variantPriceOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const productId = await variantProductId(parsed.data.variantId);
  if (!productId) {
    return {status: 'invalid', code: 'variant_not_found'};
  }
  const ownerType = await productType(productId);
  if (ownerType !== 'physical_finished') {
    return {status: 'invalid', code: 'not_physical_product'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.from('variant_market_offers').upsert(
    {
      variant_id: parsed.data.variantId,
      market_code: parsed.data.marketCode,
      currency_code: parsed.data.currencyCode,
      price_minor: parsed.data.priceMinor,
      enabled: true,
      updated_at: new Date().toISOString()
    },
    {onConflict: 'variant_id,market_code'}
  );
  if (error) {
    return mapWriteError(error, {
      action: 'variant_price_override_save',
      productId,
      referenceId: parsed.data.variantId,
      summary: 'Catalog variant price override save failed'
    });
  }

  revalidateVariants(productId);
  return {status: 'success', message: 'Price override saved'};
}

export async function removeVariantPriceOverrideAction(
  input: RemoveVariantPriceOverrideInput
): Promise<VariantActionResult> {
  await requireAdmin();
  const parsed = removeVariantPriceOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const productId = await variantProductId(parsed.data.variantId);
  if (!productId) {
    return {status: 'invalid', code: 'variant_not_found'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('variant_market_offers')
    .delete()
    .eq('variant_id', parsed.data.variantId)
    .eq('market_code', parsed.data.marketCode);
  if (error) {
    return monitoredVariantFailure({
      action: 'variant_price_override_remove',
      productId,
      referenceId: parsed.data.variantId,
      code: 'remove_failed',
      summary: 'Catalog variant price override remove failed'
    });
  }

  revalidateVariants(productId);
  return {status: 'success', message: 'Price override removed'};
}

export async function adjustInventoryAction(input: InventoryAdjustmentInput): Promise<VariantActionResult> {
  await requireAdmin();
  const parsed = inventoryAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const ownerType = await productType(parsed.data.productId);
  if (!ownerType) {
    return {status: 'invalid', code: 'product_not_found'};
  }
  if (ownerType !== 'physical_finished') {
    return {status: 'invalid', code: 'not_physical_product'};
  }

  if (parsed.data.ownerType === 'product' && (await productHasVariants(parsed.data.productId))) {
    return {status: 'invalid', code: 'wrong_inventory_owner'};
  }

  if (parsed.data.ownerType === 'variant') {
    const ownerProductId = await variantProductId(parsed.data.variantId);
    if (ownerProductId !== parsed.data.productId) {
      return {status: 'invalid', code: 'wrong_inventory_owner'};
    }
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.from('inventory_records').upsert(
    parsed.data.ownerType === 'product'
      ? {
          product_id: parsed.data.productId,
          variant_id: null,
          quantity_on_hand: parsed.data.quantityOnHand
        }
      : {
          product_id: null,
          variant_id: parsed.data.variantId,
          quantity_on_hand: parsed.data.quantityOnHand
        },
    {onConflict: parsed.data.ownerType === 'product' ? 'product_id' : 'variant_id'}
  );
  if (error) {
    return mapWriteError(error, {
      action: 'inventory_adjust',
      productId: parsed.data.productId,
      referenceId: parsed.data.ownerType === 'variant' ? parsed.data.variantId : parsed.data.productId,
      summary: 'Catalog inventory adjustment failed'
    });
  }

  revalidateVariants(parsed.data.productId);
  return {status: 'success', message: 'Inventory saved'};
}

export async function saveVariantShippingProfileAction(input: unknown): Promise<VariantShippingProfileResult> {
  await requireAdmin();
  const parsed = variantShippingProfileSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_assignment'};

  return runMonitoredAction({
    area: 'admin',
    action: 'catalog_variant_shipping_profile_save',
    errorCode: 'catalog_variant_shipping_profile_failed',
    summary: 'Catalog variant shipping profile save failed',
    facts: {referenceId: parsed.data.variantId},
    errorResult: {status: 'error', code: 'shipping_assignment_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      const {data: variant, error: variantError} = await supabase
        .from('product_variants')
        .select('id, product_id')
        .eq('id', parsed.data.variantId)
        .maybeSingle();
      if (variantError || !variant) return {status: 'invalid', code: 'variant_not_found'} as const;

      if (parsed.data.shippingProfileId === 'store_default') {
        const {error} = await supabase
          .from('variant_shipping_profiles')
          .delete()
          .eq('variant_id', parsed.data.variantId);
        if (error) return {status: 'error', code: 'shipping_assignment_failed'} as const;
        revalidateVariants(variant.product_id);
        return {status: 'saved'} as const;
      }

      const {data: profile, error: profileError} = await supabase
        .from('shipping_profiles')
        .select('id')
        .eq('id', parsed.data.shippingProfileId)
        .eq('active', true)
        .maybeSingle();
      if (profileError || !profile) return {status: 'invalid', code: 'inactive_shipping_profile'} as const;

      const {error} = await supabase.from('variant_shipping_profiles').upsert(
        {variant_id: parsed.data.variantId, profile_id: profile.id},
        {onConflict: 'variant_id'}
      );
      if (error) return {status: 'error', code: 'shipping_assignment_failed'} as const;
      revalidateVariants(variant.product_id);
      return {status: 'saved'} as const;
    }
  });
}
