'use server';

import {revalidatePath} from 'next/cache';
import {requireAdmin, requireUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure as sharedRecordOperationalFailure} from '@/operations/errors';
import {
  moderateProductReview,
  removeReviewReply,
  submitProductReview,
  upsertReviewReply,
  type ReviewActionState,
  type ReviewAdminActionResult,
  type RpcClient
} from './mutations';

export type {ReviewActionState, ReviewAdminActionResult} from './mutations';

function localeFromForm(formData: FormData): Locale {
  return formData.get('locale') === 'en' ? 'en' : 'vi';
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

async function getAdminRpcClient() {
  await requireAdmin();
  return await createSupabaseServerClient() as unknown as RpcClient;
}

function revalidateReviewSurfaces() {
  revalidatePath('/admin/reviews');
  revalidatePath('/en/product/[productSlug]', 'page');
  revalidatePath('/vi/san-pham/[productSlug]', 'page');
}

export async function approveProductReviewAction(
  _previousState: ReviewAdminActionResult,
  formData: FormData
): Promise<ReviewAdminActionResult> {
  const client = await getAdminRpcClient();
  const result = await moderateProductReview({
    reviewId: formString(formData, 'reviewId'),
    expectedVersion: formString(formData, 'expectedVersion'),
    expectedStatus: formString(formData, 'expectedStatus'),
    targetStatus: 'approved',
    moderationNote: formString(formData, 'moderationNote')
  }, client, sharedRecordOperationalFailure);
  revalidateReviewSurfaces();
  return result;
}

export async function hideProductReviewAction(
  _previousState: ReviewAdminActionResult,
  formData: FormData
): Promise<ReviewAdminActionResult> {
  const client = await getAdminRpcClient();
  const result = await moderateProductReview({
    reviewId: formString(formData, 'reviewId'),
    expectedVersion: formString(formData, 'expectedVersion'),
    expectedStatus: formString(formData, 'expectedStatus'),
    targetStatus: 'hidden',
    moderationNote: formString(formData, 'moderationNote')
  }, client, sharedRecordOperationalFailure);
  revalidateReviewSurfaces();
  return result;
}

export async function upsertReviewReplyAction(
  _previousState: ReviewAdminActionResult,
  formData: FormData
): Promise<ReviewAdminActionResult> {
  const client = await getAdminRpcClient();
  const result = await upsertReviewReply({
    reviewId: formString(formData, 'reviewId'),
    expectedReviewVersion: formString(formData, 'expectedReviewVersion'),
    expectedReviewStatus: formString(formData, 'expectedReviewStatus'),
    body: formString(formData, 'body')
  }, client, sharedRecordOperationalFailure);
  revalidateReviewSurfaces();
  return result;
}

export async function removeReviewReplyAction(
  _previousState: ReviewAdminActionResult,
  formData: FormData
): Promise<ReviewAdminActionResult> {
  const client = await getAdminRpcClient();
  const result = await removeReviewReply({
    reviewId: formString(formData, 'reviewId'),
    expectedReviewVersion: formString(formData, 'expectedReviewVersion'),
    expectedReviewStatus: formString(formData, 'expectedReviewStatus'),
    expectedReplyVersion: formString(formData, 'expectedReplyVersion')
  }, client, sharedRecordOperationalFailure);
  revalidateReviewSurfaces();
  return result;
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
    client: client as unknown as RpcClient,
    recordOperationalFailure: sharedRecordOperationalFailure
  });
  if (result.status === 'pending') {
    revalidatePath(productPath);
  }
  return result;
}
