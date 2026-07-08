'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';

export type CreateDiscountCodeResult =
  | {status: 'created'; discountId: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: 'create_failed'};

export type DisableDiscountCodeResult =
  | {status: 'disabled'}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: 'disable_failed'};

const discountCodeFormSchema = z.object({
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(500).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  percentage: z.string().trim().optional(),
  amount: z.string().trim().optional(),
  currencyCode: z.enum(['VND', 'USD']).optional(),
  market: z.enum(['all', 'vn', 'intl']),
  minimumSubtotal: z.string().trim().optional(),
  usageLimit: z.string().trim().optional()
});

const disableDiscountCodeSchema = z.object({
  discountId: z.guid()
});

function moneyToMinor(value: string | undefined, currencyCode: 'VND' | 'USD') {
  const normalized = (value ?? '').replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return currencyCode === 'USD' ? Math.round(parsed * 100) : Math.round(parsed);
}

function percentToBps(value: string | undefined) {
  const parsed = Number((value ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    return null;
  }
  return Math.round(parsed * 100);
}

async function recordDiscountFailure(input: {
  action: 'discount_create' | 'discount_disable';
  errorCode: 'discount_create_failed' | 'discount_disable_failed';
  resultCode: 'create_failed' | 'disable_failed';
  summary: string;
  referenceId?: string;
  market?: 'vn' | 'intl' | null;
  currency?: 'VND' | 'USD' | null;
}) {
  await recordOperationalFailure({
    area: 'admin',
    severity: 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      action: input.action,
      code: input.resultCode,
      referenceId: input.referenceId,
      market: input.market ?? undefined,
      currency: input.currency ?? undefined
    }
  });
}

export async function createDiscountCodeAction(formData: FormData): Promise<CreateDiscountCodeResult> {
  await requireAdmin();
  const parsed = discountCodeFormSchema.safeParse({
    code: formData.get('code'),
    description: formData.get('description') ?? '',
    discountType: formData.get('discountType'),
    percentage: formData.get('percentage') ?? '',
    amount: formData.get('amount') ?? '',
    currencyCode: formData.get('currencyCode') ?? undefined,
    market: formData.get('market'),
    minimumSubtotal: formData.get('minimumSubtotal') ?? '',
    usageLimit: formData.get('usageLimit') ?? ''
  });
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_discount'};
  }

  const code = parsed.data.code.toUpperCase();
  const market = parsed.data.market === 'all' ? null : parsed.data.market;
  const currencyCode = parsed.data.discountType === 'fixed' ? parsed.data.currencyCode : null;
  const percentageBps = parsed.data.discountType === 'percentage' ? percentToBps(parsed.data.percentage) : null;
  const amountMinor =
    parsed.data.discountType === 'fixed' && currencyCode ? moneyToMinor(parsed.data.amount, currencyCode) : null;
  const minimumCurrency = currencyCode ?? (market === 'vn' ? 'VND' : 'USD');
  const minimumSubtotalMinor = moneyToMinor(parsed.data.minimumSubtotal, minimumCurrency);
  const usageLimit = parsed.data.usageLimit ? Number(parsed.data.usageLimit) : null;

  if (
    (parsed.data.discountType === 'percentage' && percentageBps === null) ||
    (parsed.data.discountType === 'fixed' && (amountMinor === null || amountMinor <= 0)) ||
    minimumSubtotalMinor === null ||
    (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0))
  ) {
    return {status: 'invalid', code: 'invalid_discount'};
  }

  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('discount_codes')
    .insert({
      code,
      description: parsed.data.description ?? '',
      discount_type: parsed.data.discountType,
      percentage_bps: percentageBps,
      amount_minor: amountMinor,
      currency_code: currencyCode,
      market,
      minimum_subtotal_minor: minimumSubtotalMinor,
      usage_limit: usageLimit
    })
    .select('id')
    .single();
  if (error || !data) {
    await recordDiscountFailure({
      action: 'discount_create',
      errorCode: 'discount_create_failed',
      resultCode: 'create_failed',
      summary: 'Admin discount code creation failed',
      market,
      currency: currencyCode
    });
    return {status: 'error', code: 'create_failed'};
  }

  revalidatePath('/admin/discounts');
  return {status: 'created', discountId: data.id};
}

export async function disableDiscountCodeAction(discountId: string): Promise<DisableDiscountCodeResult> {
  await requireAdmin();
  const parsed = disableDiscountCodeSchema.safeParse({discountId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_discount'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('discount_codes')
    .update({active: false, updated_at: new Date().toISOString()})
    .eq('id', parsed.data.discountId);
  if (error) {
    await recordDiscountFailure({
      action: 'discount_disable',
      errorCode: 'discount_disable_failed',
      resultCode: 'disable_failed',
      summary: 'Admin discount code disable failed',
      referenceId: parsed.data.discountId
    });
    return {status: 'error', code: 'disable_failed'};
  }

  revalidatePath('/admin/discounts');
  return {status: 'disabled'};
}
