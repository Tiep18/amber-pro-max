'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {parseProductReviewInput} from '@/reviews/eligibility';
import {requireAdmin, requireUser} from '@/auth/guards';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure as sharedRecordOperationalFailure} from '@/operations/errors';
import {runMonitoredAction} from '@/operations/monitoring';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

export type ReviewActionState =
  | {status: 'idle'}
  | {status: 'pending'}
  | {status: 'not_eligible'}
  | {status: 'invalid'; code: 'invalid_review' | 'client_verified_purchase_not_allowed'}
  | {status: 'error'; code: 'review_submit_failed'};

const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'hidden']);

const moderationInputSchema = z.object({
  reviewId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  expectedStatus: reviewStatusSchema,
  targetStatus: z.enum(['approved', 'hidden']),
  moderationNote: z.string().trim().max(500).optional()
});

const replyInputSchema = z.object({
  reviewId: z.string().uuid(),
  expectedReviewVersion: z.coerce.number().int().positive(),
  expectedReviewStatus: reviewStatusSchema,
  body: z.string().trim().min(1).max(2000)
});

const removeReplyInputSchema = z.object({
  reviewId: z.string().uuid(),
  expectedReviewVersion: z.coerce.number().int().positive(),
  expectedReviewStatus: reviewStatusSchema,
  expectedReplyVersion: z.coerce.number().int().positive()
});

export type ReviewAdminActionResult =
  | {status: 'idle'}
  | {status: 'approved' | 'hidden'; version: number}
  | {status: 'saved'; replyVersion: number}
  | {status: 'removed'}
  | {status: 'stale'; version: number | null}
  | {status: 'forbidden' | 'not_found'}
  | {status: 'invalid'; code: 'invalid_review_admin_action'}
  | {status: 'error'; code: 'review_admin_action_failed'};

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

function numericField(data: Record<string, unknown>, key: string) {
  return typeof data[key] === 'number' ? data[key] : null;
}

function mapAdminRpcResult(data: unknown): ReviewAdminActionResult {
  if (!isRecord(data) || typeof data.status !== 'string') {
    return {status: 'error', code: 'review_admin_action_failed'};
  }
  if (data.status === 'approved' || data.status === 'hidden') {
    const version = numericField(data, 'version');
    return version === null ? {status: 'error', code: 'review_admin_action_failed'} : {status: data.status, version};
  }
  if (data.status === 'saved') {
    const replyVersion = numericField(data, 'reply_version');
    return replyVersion === null ? {status: 'error', code: 'review_admin_action_failed'} : {status: 'saved', replyVersion};
  }
  if (data.status === 'removed') {
    return {status: 'removed'};
  }
  if (data.status === 'stale') {
    return {status: 'stale', version: numericField(data, 'version')};
  }
  if (data.status === 'forbidden' || data.status === 'not_found') {
    return {status: data.status};
  }
  if (data.status === 'invalid') {
    return {status: 'invalid', code: 'invalid_review_admin_action'};
  }
  return {status: 'error', code: 'review_admin_action_failed'};
}

async function recordReviewAdminFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {action: string; referenceId?: string; status?: string; summary: string}
) {
  if (!recorder) {
    return;
  }
  await runMonitoredAction({
    area: 'admin',
    action: input.action,
    errorCode: 'review_admin_action_failed',
    summary: input.summary,
    errorResult: {status: 'error', code: 'review_admin_action_failed'},
    shouldRecordResult: () => true,
    facts: {
      referenceId: input.referenceId ?? null,
      status: input.status ?? null
    },
    recordOperationalFailure: recorder,
    operation: async () => ({status: 'error', code: 'review_admin_action_failed'})
  });
}

async function recordReviewSubmitFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {productId: string; summary: string}
) {
  if (!recorder) {
    return;
  }
  await runMonitoredAction({
    area: 'application',
    action: 'review_submit',
    errorCode: 'review_submit_failed',
    summary: input.summary,
    errorResult: {status: 'error', code: 'review_submit_failed'},
    shouldRecordResult: () => true,
    facts: {
      productId: input.productId
    },
    recordOperationalFailure: recorder,
    operation: async () => ({status: 'error', code: 'review_submit_failed'})
  });
}

export async function moderateProductReview(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<ReviewAdminActionResult> {
  const parsed = moderationInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_review_admin_action'};
  }
  const {data, error} = await client.rpc('moderate_product_review', {
    p_review_id: parsed.data.reviewId,
    p_expected_version: parsed.data.expectedVersion,
    p_expected_status: parsed.data.expectedStatus,
    p_target_status: parsed.data.targetStatus,
    p_moderation_note: parsed.data.moderationNote ?? null
  });
  if (error) {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_moderate',
      referenceId: parsed.data.reviewId,
      status: parsed.data.targetStatus,
      summary: 'Review moderation RPC failed'
    });
    return {status: 'error', code: 'review_admin_action_failed'};
  }
  const result = mapAdminRpcResult(data);
  if (result.status === 'error') {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_moderate',
      referenceId: parsed.data.reviewId,
      status: parsed.data.targetStatus,
      summary: 'Review moderation returned an unexpected result'
    });
  }
  return result;
}

export async function upsertReviewReply(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<ReviewAdminActionResult> {
  const parsed = replyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_review_admin_action'};
  }
  const {data, error} = await client.rpc('upsert_review_admin_reply', {
    p_review_id: parsed.data.reviewId,
    p_expected_review_version: parsed.data.expectedReviewVersion,
    p_expected_review_status: parsed.data.expectedReviewStatus,
    p_body: parsed.data.body
  });
  if (error) {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_reply_upsert',
      referenceId: parsed.data.reviewId,
      status: parsed.data.expectedReviewStatus,
      summary: 'Review reply upsert RPC failed'
    });
    return {status: 'error', code: 'review_admin_action_failed'};
  }
  const result = mapAdminRpcResult(data);
  if (result.status === 'error') {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_reply_upsert',
      referenceId: parsed.data.reviewId,
      status: parsed.data.expectedReviewStatus,
      summary: 'Review reply upsert returned an unexpected result'
    });
  }
  return result;
}

export async function removeReviewReply(
  input: unknown,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<ReviewAdminActionResult> {
  const parsed = removeReplyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_review_admin_action'};
  }
  const {data, error} = await client.rpc('remove_review_admin_reply', {
    p_review_id: parsed.data.reviewId,
    p_expected_review_version: parsed.data.expectedReviewVersion,
    p_expected_review_status: parsed.data.expectedReviewStatus,
    p_expected_reply_version: parsed.data.expectedReplyVersion
  });
  if (error) {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_reply_remove',
      referenceId: parsed.data.reviewId,
      status: parsed.data.expectedReviewStatus,
      summary: 'Review reply removal RPC failed'
    });
    return {status: 'error', code: 'review_admin_action_failed'};
  }
  const result = mapAdminRpcResult(data);
  if (result.status === 'error') {
    await recordReviewAdminFailure(recordOperationalFailure, {
      action: 'review_reply_remove',
      referenceId: parsed.data.reviewId,
      status: parsed.data.expectedReviewStatus,
      summary: 'Review reply removal returned an unexpected result'
    });
  }
  return result;
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

export async function submitProductReview({
  productId,
  input,
  client,
  recordOperationalFailure
}: {
  productId: string;
  input: unknown;
  client: RpcClient;
  recordOperationalFailure?: OperationalFailureRecorder;
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
    await recordReviewSubmitFailure(recordOperationalFailure, {
      productId,
      summary: 'Product review submit failed'
    });
    return {status: 'error', code: 'review_submit_failed'};
  }
  if (data.status === 'pending') {
    return {status: 'pending'};
  }
  if (data.status === 'not_eligible') {
    return {status: 'not_eligible'};
  }
  await recordReviewSubmitFailure(recordOperationalFailure, {
    productId,
    summary: 'Product review submit returned an unexpected result'
  });
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
    client: client as unknown as RpcClient,
    recordOperationalFailure: sharedRecordOperationalFailure
  });
  if (result.status === 'pending') {
    revalidatePath(productPath);
  }
  return result;
}
