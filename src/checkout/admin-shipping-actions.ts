'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';

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

function moneyToMinor(value: string, currencyCode: 'VND' | 'USD') {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return currencyCode === 'USD' ? Math.round(parsed * 100) : Math.round(parsed);
}

async function recordShippingFailure(input: {
  action: 'shipping_profile_create' | 'shipping_rule_create' | 'shipping_deactivate';
  resultCode: 'create_failed' | 'deactivate_failed';
  summary: string;
  referenceId?: string;
  currency?: 'VND' | 'USD';
}) {
  await recordOperationalFailure({
    area: 'admin',
    severity: 'error',
    errorCode: input.resultCode === 'create_failed' ? 'shipping_create_failed' : 'shipping_deactivate_failed',
    summary: input.summary,
    facts: {
      action: input.action,
      code: input.resultCode,
      referenceId: input.referenceId,
      currency: input.currency
    }
  });
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

  const supabase = await createSupabaseServerClient();
  const {data: profile, error: profileError} = await supabase
    .from('shipping_profiles')
    .insert({name: parsed.data.name, description: parsed.data.description ?? ''})
    .select('id')
    .single();
  if (profileError || !profile) {
    await recordShippingFailure({
      action: 'shipping_profile_create',
      resultCode: 'create_failed',
      summary: 'Admin shipping profile creation failed',
      currency: parsed.data.currencyCode
    });
    return {status: 'error', code: 'create_failed'};
  }

  const {error: ruleError} = await supabase.from('shipping_rules').insert({
    profile_id: profile.id,
    country_code: parsed.data.countryCode,
    currency_code: parsed.data.currencyCode,
    first_item_fee_minor: firstItemFeeMinor,
    additional_item_fee_minor: additionalItemFeeMinor
  });
  if (ruleError) {
    await recordShippingFailure({
      action: 'shipping_rule_create',
      resultCode: 'create_failed',
      summary: 'Admin shipping rule creation failed',
      referenceId: profile.id,
      currency: parsed.data.currencyCode
    });
    return {status: 'error', code: 'create_failed'};
  }

  revalidatePath('/admin/shipping');
  return {status: 'created', profileId: profile.id};
}

export async function deactivateShippingProfileAction(profileId: string): Promise<DeactivateShippingProfileResult> {
  await requireAdmin();
  const parsed = deactivateShippingProfileSchema.safeParse({profileId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_shipping_profile'};
  }

  const supabase = await createSupabaseServerClient();
  const {error: profileError} = await supabase
    .from('shipping_profiles')
    .update({active: false, updated_at: new Date().toISOString()})
    .eq('id', parsed.data.profileId);
  if (profileError) {
    await recordShippingFailure({
      action: 'shipping_deactivate',
      resultCode: 'deactivate_failed',
      summary: 'Admin shipping profile deactivation failed',
      referenceId: parsed.data.profileId
    });
    return {status: 'error', code: 'deactivate_failed'};
  }

  const {error: ruleError} = await supabase
    .from('shipping_rules')
    .update({active: false, updated_at: new Date().toISOString()})
    .eq('profile_id', parsed.data.profileId);
  if (ruleError) {
    await recordShippingFailure({
      action: 'shipping_deactivate',
      resultCode: 'deactivate_failed',
      summary: 'Admin shipping rule deactivation failed',
      referenceId: parsed.data.profileId
    });
    return {status: 'error', code: 'deactivate_failed'};
  }

  revalidatePath('/admin/shipping');
  return {status: 'deactivated'};
}
