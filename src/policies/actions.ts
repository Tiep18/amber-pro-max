'use server';

import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/auth/guards';
import {invalidatePolicyCache} from '@/lib/cache-invalidation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import {mapPolicyPublishIssues, type PolicyPublishBlocker} from './publish-checks';
import {policyDraftSchema, policyIdSchema, type PolicyDraftInput} from './schemas';

type ValidationIssue = {path: string; code: string};

export type SavePolicyResult =
  | {status: 'saved'; policyId: string}
  | {status: 'invalid'; issues: ValidationIssue[]}
  | {status: 'error'; code: 'policy_save_failed'};

export type PublishPolicyResult =
  | {status: 'published'; policyId: string}
  | {status: 'blocked'; policyId: string; issues: PolicyPublishBlocker[]}
  | {status: 'invalid'; code: 'invalid_policy_id'}
  | {status: 'error'; code: 'policy_publish_failed'};

export type UnpublishPolicyResult =
  | {status: 'unpublished'; policyId: string}
  | {status: 'invalid'; code: 'invalid_policy_id'}
  | {status: 'error'; code: 'policy_unpublish_failed'};

function validationIssues(error: {issues: {path: PropertyKey[]; message: string}[]}): ValidationIssue[] {
  return error.issues.map((issue) => ({path: issue.path.join('.'), code: issue.message}));
}

async function recordPolicyFailure({
  action,
  errorCode,
  summary,
  referenceId
}: {
  action: 'policy_save' | 'policy_save_translations' | 'policy_publish' | 'policy_publish_issues' | 'policy_unpublish';
  errorCode: 'policy_save_failed' | 'policy_publish_failed' | 'policy_unpublish_failed';
  summary: string;
  referenceId?: string | null;
}) {
  await runMonitoredAction({
    area: 'admin',
    action,
    errorCode,
    summary,
    errorResult: {status: 'error', code: errorCode} as const,
    shouldRecordResult: () => true,
    facts: {
      referenceId: referenceId ?? null
    },
    operation: async () => ({status: 'error', code: errorCode}) as const
  });
}

export async function savePolicyDraftAction(input: PolicyDraftInput): Promise<SavePolicyResult> {
  const admin = await requireAdmin();
  const parsed = policyDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', issues: validationIssues(parsed.error)};
  }

  const draft = parsed.data;
  const supabase = await createSupabaseServerClient();
  const policyResult = draft.policyId
    ? await supabase
        .from('policy_pages')
        .update({policy_kind: draft.policyKind, updated_at: new Date().toISOString()})
        .eq('id', draft.policyId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('policy_pages')
        .insert({policy_kind: draft.policyKind, created_by: admin.id})
        .select('id')
        .single();

  if (policyResult.error || !policyResult.data) {
    await recordPolicyFailure({
      action: 'policy_save',
      errorCode: 'policy_save_failed',
      summary: 'Policy page save failed',
      referenceId: draft.policyId ?? null
    });
    return {status: 'error', code: 'policy_save_failed'};
  }

  const policyId = policyResult.data.id;
  const translations = (['vi', 'en'] as const).map((locale) => {
    const translation = draft.translations[locale];
    return {
      policy_id: policyId,
      locale,
      slug: translation.slug,
      title: translation.title,
      summary: translation.summary,
      body: translation.body,
      seo_title: translation.seoTitle,
      seo_description: translation.seoDescription,
      social_image_bucket: translation.socialImageBucket,
      social_image_path: translation.socialImagePath
    };
  });
  const {error} = await supabase.from('policy_page_translations').upsert(translations, {onConflict: 'policy_id,locale'});
  if (error) {
    await recordPolicyFailure({
      action: 'policy_save_translations',
      errorCode: 'policy_save_failed',
      summary: 'Policy translation save failed',
      referenceId: policyId
    });
    return {status: 'error', code: 'policy_save_failed'};
  }

  revalidatePath('/admin/policies');
  invalidatePolicyCache();
  return {status: 'saved', policyId};
}

export async function publishPolicyAction(policyId: string): Promise<PublishPolicyResult> {
  await requireAdmin();
  const parsed = policyIdSchema.safeParse(policyId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_policy_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('publish_policy_page', {target_policy_id: parsed.data});
  if (error || !data?.[0]) {
    await recordPolicyFailure({
      action: 'policy_publish',
      errorCode: 'policy_publish_failed',
      summary: error ? 'Policy publish failed' : 'Policy publish returned an unexpected result',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'policy_publish_failed'};
  }
  if (data[0].published) {
    revalidatePath('/admin/policies');
    invalidatePolicyCache();
    return {status: 'published', policyId: parsed.data};
  }

  const issueResult = await supabase.rpc('policy_publish_issues', {target_policy_id: parsed.data});
  if (issueResult.error || !issueResult.data) {
    await recordPolicyFailure({
      action: 'policy_publish_issues',
      errorCode: 'policy_publish_failed',
      summary: issueResult.error ? 'Policy publish issue lookup failed' : 'Policy publish issue lookup returned an unexpected result',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'policy_publish_failed'};
  }

  return {status: 'blocked', policyId: parsed.data, issues: mapPolicyPublishIssues(issueResult.data)};
}

export async function unpublishPolicyAction(policyId: string): Promise<UnpublishPolicyResult> {
  await requireAdmin();
  const parsed = policyIdSchema.safeParse(policyId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_policy_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('policy_pages')
    .update({status: 'draft', published_at: null, updated_at: new Date().toISOString()})
    .eq('id', parsed.data);
  if (error) {
    await recordPolicyFailure({
      action: 'policy_unpublish',
      errorCode: 'policy_unpublish_failed',
      summary: 'Policy unpublish failed',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'policy_unpublish_failed'};
  }

  revalidatePath('/admin/policies');
  invalidatePolicyCache();
  return {status: 'unpublished', policyId: parsed.data};
}
