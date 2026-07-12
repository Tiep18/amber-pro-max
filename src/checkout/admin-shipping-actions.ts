'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';

// Phase 08 tables/RPCs are introduced by the pending migration. Keep this narrow
// bridge until `src/types/supabase.ts` is regenerated against that migration.
type ShippingAdminDatabaseClient = {
  from: (table: string) => ShippingAdminQuery;
  rpc: (functionName: string, args: Record<string, unknown>) => Promise<{error: unknown}>;
};

type ShippingAdminQuery = {
  update: (values: object) => {eq: (column: string, value: string) => Promise<{error: unknown}>};
  insert: (values: object) => {
    select: (columns: string) => {single: () => Promise<{data: {id: string} | null; error: unknown}>};
  };
};

export type CreateShippingProfileResult =
  | {status: 'created'; profileId: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: 'create_failed'};

export type DeactivateShippingProfileResult =
  | {status: 'deactivated'}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: 'deactivate_failed'};

const shippingProfileFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  currencyCode: z.enum(['VND', 'USD']),
  firstItemFee: z.string().trim().min(1),
  additionalItemFee: z.string().trim().min(1)
});

const deactivateShippingProfileSchema = z.object({
  profileId: z.guid()
});

const profileIdSchema = z.guid();
const currencySchema = z.enum(['VND', 'USD']);
const usRegionCodeSchema = z.string().trim().toUpperCase().regex(/^(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MH|MA|MI|FM|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)$/);

export const shippingProfileSaveSchema = z.object({
  profileId: profileIdSchema.optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  active: z.boolean()
}).strict();

export const shippingRuleSaveSchema = z.object({
  ruleId: profileIdSchema.optional(),
  profileId: profileIdSchema,
  destinationKind: z.enum(['exact_country', 'fallback']),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).nullable().optional(),
  currencyCode: currencySchema,
  firstItemFeeMinor: z.number().int().min(0).max(2_147_483_647),
  additionalItemFeeMinor: z.number().int().min(0).max(2_147_483_647),
  active: z.boolean()
}).strict().superRefine((value, context) => {
  if (value.destinationKind === 'exact_country' && !value.countryCode) {
    context.addIssue({code: 'custom', path: ['countryCode'], message: 'An exact rule needs a country.'});
  }
  if (value.destinationKind === 'fallback' && value.countryCode) {
    context.addIssue({code: 'custom', path: ['countryCode'], message: 'A fallback rule has no country.'});
  }
});

export const shippingRegionAdjustmentSaveSchema = z.object({
  adjustmentId: profileIdSchema.optional(),
  shippingRuleId: profileIdSchema,
  countryCode: z.literal('US'),
  regionCode: usRegionCodeSchema,
  mode: z.enum(['surcharge', 'replace']),
  firstItemFeeMinor: z.number().int().min(0).max(2_147_483_647),
  additionalItemFeeMinor: z.number().int().min(0).max(2_147_483_647),
  active: z.boolean()
}).strict();

export type ShippingAdminActionResult =
  | {status: 'saved'; id: string}
  | {status: 'updated'}
  | {status: 'invalid'; code: 'invalid_shipping_profile' | 'invalid_shipping_rule' | 'invalid_shipping_region'}
  | {status: 'error'; code: 'shipping_profile_failed' | 'shipping_rule_failed' | 'shipping_region_failed' | 'shipping_default_failed'};

function adminShippingMutation<T extends ShippingAdminActionResult>({
  action,
  errorCode,
  errorResult,
  operation
}: {
  action: string;
  errorCode: string;
  errorResult: T;
  operation: () => Promise<T>;
}) {
  return runMonitoredAction({
    area: 'admin',
    action,
    errorCode,
    summary: 'Admin shipping configuration failed',
    facts: {},
    errorResult,
    shouldRecordResult: (result) => result.status === 'error',
    operation
  });
}

function moneyToMinor(value: string, currencyCode: 'VND' | 'USD') {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return currencyCode === 'USD' ? Math.round(parsed * 100) : Math.round(parsed);
}

export async function createShippingProfileAction(formData: FormData): Promise<CreateShippingProfileResult> {
  await requireAdmin();
  const parsed = shippingProfileFormSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    countryCode: formData.get('countryCode'),
    currencyCode: formData.get('currencyCode'),
    firstItemFee: formData.get('firstItemFee'),
    additionalItemFee: formData.get('additionalItemFee')
  });
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_shipping_profile'};
  }

  const firstItemFeeMinor = moneyToMinor(parsed.data.firstItemFee, parsed.data.currencyCode);
  const additionalItemFeeMinor = moneyToMinor(parsed.data.additionalItemFee, parsed.data.currencyCode);
  if (firstItemFeeMinor === null || additionalItemFeeMinor === null) {
    return {status: 'invalid', code: 'invalid_fee'};
  }

  let failurePhase: 'shipping_profile_create' | 'shipping_rule_create' = 'shipping_profile_create';
  let referenceId: string | undefined;

  return runMonitoredAction({
    area: 'admin',
    action: 'shipping_create',
    errorCode: 'shipping_create_failed',
    summary: 'Admin shipping creation failed',
    facts: {
      currency: parsed.data.currencyCode
    },
    errorResult: {status: 'error', code: 'create_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => ({
      phase: failurePhase,
      ...(referenceId ? {referenceId} : {})
    }),
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      const {data: profile, error: profileError} = await supabase
        .from('shipping_profiles')
        .insert({name: parsed.data.name, description: parsed.data.description ?? ''})
        .select('id')
        .single();
      if (profileError || !profile) {
        return {status: 'error', code: 'create_failed'} as const;
      }

      failurePhase = 'shipping_rule_create';
      referenceId = profile.id;
      const {error: ruleError} = await supabase.from('shipping_rules').insert({
        profile_id: profile.id,
        country_code: parsed.data.countryCode,
        currency_code: parsed.data.currencyCode,
        first_item_fee_minor: firstItemFeeMinor,
        additional_item_fee_minor: additionalItemFeeMinor
      });
      if (ruleError) {
        return {status: 'error', code: 'create_failed'} as const;
      }

      revalidatePath('/admin/shipping');
      return {status: 'created', profileId: profile.id} as const;
    }
  });
}

export async function deactivateShippingProfileAction(profileId: string): Promise<DeactivateShippingProfileResult> {
  await requireAdmin();
  const parsed = deactivateShippingProfileSchema.safeParse({profileId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_shipping_profile'};
  }

  let failurePhase: 'shipping_profile_deactivate' | 'shipping_rule_deactivate' = 'shipping_profile_deactivate';

  return runMonitoredAction({
    area: 'admin',
    action: 'shipping_deactivate',
    errorCode: 'shipping_deactivate_failed',
    summary: 'Admin shipping deactivation failed',
    facts: {
      referenceId: parsed.data.profileId
    },
    errorResult: {status: 'error', code: 'deactivate_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => ({phase: failurePhase}),
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      const {error: profileError} = await supabase
        .from('shipping_profiles')
        .update({active: false, updated_at: new Date().toISOString()})
        .eq('id', parsed.data.profileId);
      if (profileError) {
        return {status: 'error', code: 'deactivate_failed'} as const;
      }

      failurePhase = 'shipping_rule_deactivate';
      const {error: ruleError} = await supabase
        .from('shipping_rules')
        .update({active: false, updated_at: new Date().toISOString()})
        .eq('profile_id', parsed.data.profileId);
      if (ruleError) {
        return {status: 'error', code: 'deactivate_failed'} as const;
      }

      revalidatePath('/admin/shipping');
      return {status: 'deactivated'} as const;
    }
  });
}

export async function saveShippingProfileAction(input: unknown): Promise<ShippingAdminActionResult> {
  await requireAdmin();
  const parsed = shippingProfileSaveSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_profile'};

  return adminShippingMutation({
    action: 'shipping_profile_save',
    errorCode: 'shipping_profile_failed',
    errorResult: {status: 'error', code: 'shipping_profile_failed'} as const,
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      const values = {
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        active: parsed.data.active,
        updated_at: new Date().toISOString()
      };
      if (parsed.data.profileId) {
        const {error} = await supabase.from('shipping_profiles').update(values).eq('id', parsed.data.profileId);
        return error ? {status: 'error', code: 'shipping_profile_failed'} as const : {status: 'updated'} as const;
      }
      const {data, error} = await supabase.from('shipping_profiles').insert(values).select('id').single();
      return error || !data
        ? {status: 'error', code: 'shipping_profile_failed'} as const
        : {status: 'saved', id: data.id} as const;
    }
  }).then((result) => {
    if (result.status === 'saved' || result.status === 'updated') revalidatePath('/admin/shipping');
    return result;
  });
}

export async function setStoreDefaultShippingProfileAction(profileId: string): Promise<ShippingAdminActionResult> {
  await requireAdmin();
  const parsed = profileIdSchema.safeParse(profileId);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_profile'};
  return adminShippingMutation({
    action: 'shipping_default_set',
    errorCode: 'shipping_default_failed',
    errorResult: {status: 'error', code: 'shipping_default_failed'} as const,
    operation: async () => {
      const supabase = await createSupabaseServerClient() as unknown as ShippingAdminDatabaseClient;
      const {error} = await supabase.rpc('admin_set_shipping_store_default', {p_profile_id: parsed.data});
      return error ? {status: 'error', code: 'shipping_default_failed'} as const : {status: 'updated'} as const;
    }
  }).then((result) => {
    if (result.status === 'updated') revalidatePath('/admin/shipping');
    return result;
  });
}

export async function saveShippingRuleAction(input: unknown): Promise<ShippingAdminActionResult> {
  await requireAdmin();
  const parsed = shippingRuleSaveSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_rule'};
  return adminShippingMutation({
    action: 'shipping_rule_save',
    errorCode: 'shipping_rule_failed',
    errorResult: {status: 'error', code: 'shipping_rule_failed'} as const,
    operation: async () => {
      const supabase = await createSupabaseServerClient() as unknown as ShippingAdminDatabaseClient;
      const values = {
        profile_id: parsed.data.profileId,
        match_kind: parsed.data.destinationKind,
        country_code: parsed.data.destinationKind === 'fallback' ? null : parsed.data.countryCode,
        currency_code: parsed.data.currencyCode,
        first_item_fee_minor: parsed.data.firstItemFeeMinor,
        additional_item_fee_minor: parsed.data.additionalItemFeeMinor,
        active: parsed.data.active,
        updated_at: new Date().toISOString()
      };
      if (parsed.data.ruleId) {
        const {error} = await supabase.from('shipping_rules').update(values).eq('id', parsed.data.ruleId);
        return error ? {status: 'error', code: 'shipping_rule_failed'} as const : {status: 'updated'} as const;
      }
      const {data, error} = await supabase.from('shipping_rules').insert(values).select('id').single();
      return error || !data ? {status: 'error', code: 'shipping_rule_failed'} as const : {status: 'saved', id: data.id} as const;
    }
  }).then((result) => {
    if (result.status === 'saved' || result.status === 'updated') revalidatePath('/admin/shipping');
    return result;
  });
}

export async function saveShippingRegionAdjustmentAction(input: unknown): Promise<ShippingAdminActionResult> {
  await requireAdmin();
  const parsed = shippingRegionAdjustmentSaveSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_region'};
  return adminShippingMutation({
    action: 'shipping_region_save',
    errorCode: 'shipping_region_failed',
    errorResult: {status: 'error', code: 'shipping_region_failed'} as const,
    operation: async () => {
      const supabase = await createSupabaseServerClient() as unknown as ShippingAdminDatabaseClient;
      const values = {
        shipping_rule_id: parsed.data.shippingRuleId,
        country_code: parsed.data.countryCode,
        region_code: parsed.data.regionCode,
        mode: parsed.data.mode,
        first_item_fee_minor: parsed.data.firstItemFeeMinor,
        additional_item_fee_minor: parsed.data.additionalItemFeeMinor,
        active: parsed.data.active,
        updated_at: new Date().toISOString()
      };
      if (parsed.data.adjustmentId) {
        const {error} = await supabase.from('shipping_region_adjustments').update(values).eq('id', parsed.data.adjustmentId);
        return error ? {status: 'error', code: 'shipping_region_failed'} as const : {status: 'updated'} as const;
      }
      const {data, error} = await supabase.from('shipping_region_adjustments').insert(values).select('id').single();
      return error || !data ? {status: 'error', code: 'shipping_region_failed'} as const : {status: 'saved', id: data.id} as const;
    }
  }).then((result) => {
    if (result.status === 'saved' || result.status === 'updated') revalidatePath('/admin/shipping');
    return result;
  });
}
