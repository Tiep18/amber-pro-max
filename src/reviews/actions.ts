'use server';

import {revalidatePath} from 'next/cache';
import {parseProductReviewInput} from '@/reviews/eligibility';
import {requireUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

export type ReviewActionState =
  | {status: 'idle'}
  | {status: 'pending'}
  | {status: 'not_eligible'}
  | {status: 'invalid'; code: 'invalid_review' | 'client_verified_purchase_not_allowed'}
  | {status: 'error'; code: 'review_submit_failed'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function localeFromForm(formData: FormData): Locale {
  return formData.get('locale') === 'en' ? 'en' : 'vi';
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function submitProductReview({
  productId,
  input,
  client
}: {
  productId: string;
  input: unknown;
  client: RpcClient;
}): Promise<ReviewActionState> {
  const parsed = parseProductReviewInput(input);
  if (!parsed.success) {
    return {status: 'invalid', code: parsed.code};
  }
  const {data, error} = await client.rpc('submit_product_review', {
    p_product_id: productId,
    p_rating: parsed.data.rating,
    p_title: parsed.data.title,
    p_body: parsed.data.body
  });
  if (error || !isRecord(data)) {
    return {status: 'error', code: 'review_submit_failed'};
  }
  if (data.status === 'pending') {
    return {status: 'pending'};
  }
  if (data.status === 'not_eligible') {
    return {status: 'not_eligible'};
  }
  return {status: 'error', code: 'review_submit_failed'};
}

export async function submitProductReviewAction(
  _previousState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const locale = localeFromForm(formData);
  const productPath = formString(formData, 'returnTo') ?? (locale === 'vi' ? '/vi' : '/en');
  await requireUser({locale, next: productPath});
  const client = await createSupabaseServerClient();
  const result = await submitProductReview({
    productId: formString(formData, 'productId') ?? '',
    input: {
      rating: Number(formString(formData, 'rating')),
      title: formString(formData, 'title'),
      body: formString(formData, 'body')
    },
    client: client as unknown as RpcClient
  });
  if (result.status === 'pending') {
    revalidatePath(productPath);
  }
  return result;
}
