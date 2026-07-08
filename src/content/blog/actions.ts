'use server';

import {requireAdmin} from '@/auth/guards';
import {invalidateBlogCache} from '@/lib/cache-invalidation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';
import {mapBlogPublishIssues, type BlogPublishBlocker} from './publish-checks';
import {blogPostDraftSchema, blogPostIdSchema, type BlogPostDraft, type BlogPostDraftInput} from './schemas';

type ValidationIssue = {
  path: string;
  code: string;
};

export type SaveBlogPostResult =
  | {status: 'saved'; postId: string}
  | {status: 'invalid'; issues: ValidationIssue[]}
  | {status: 'error'; code: 'save_failed'};

export type PublishBlogPostResult =
  | {status: 'published'; postId: string}
  | {status: 'blocked'; postId: string; issues: BlogPublishBlocker[]}
  | {status: 'invalid'; code: 'invalid_post_id'}
  | {status: 'error'; code: 'publish_failed'};

export type ScheduleBlogPostResult =
  | {status: 'scheduled'; postId: string; publishedAt: string}
  | {status: 'blocked'; postId: string; issues: BlogPublishBlocker[]}
  | {status: 'invalid'; code: 'invalid_schedule'}
  | {status: 'error'; code: 'schedule_failed'};

export type UnpublishBlogPostResult =
  | {status: 'unpublished'; postId: string}
  | {status: 'invalid'; code: 'invalid_post_id'}
  | {status: 'error'; code: 'unpublish_failed'};

function validationIssues(error: {issues: {path: PropertyKey[]; message: string}[]}): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.message
  }));
}

async function recordBlogFailure(input: {
  action:
    | 'blog_save_post'
    | 'blog_save_relations'
    | 'blog_publish'
    | 'blog_publish_issues'
    | 'blog_schedule'
    | 'blog_schedule_issues'
    | 'blog_unpublish';
  errorCode: 'blog_save_failed' | 'blog_publish_failed' | 'blog_schedule_failed' | 'blog_unpublish_failed';
  resultCode: 'save_failed' | 'publish_failed' | 'schedule_failed' | 'unpublish_failed';
  summary: string;
  referenceId?: string;
  status?: string;
}) {
  await recordOperationalFailure({
    area: 'admin',
    severity: 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      action: input.action,
      referenceId: input.referenceId,
      status: input.status,
      code: input.resultCode
    }
  });
}

async function replaceBlogRelations(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  postId: string,
  draft: BlogPostDraft
) {
  const relationDeletes = await Promise.all([
    supabase.from('blog_post_tags').delete().eq('post_id', postId),
    supabase.from('blog_related_products').delete().eq('post_id', postId)
  ]);
  if (relationDeletes.some(({error}) => error)) {
    return false;
  }

  const relationWrites = await Promise.all([
    draft.tagIds.length
      ? supabase.from('blog_post_tags').insert(draft.tagIds.map((tagId) => ({post_id: postId, tag_id: tagId})))
      : Promise.resolve({error: null}),
    draft.relatedProducts.length
      ? supabase.from('blog_related_products').insert(
          draft.relatedProducts.map(({productId, displayOrder}) => ({
            post_id: postId,
            product_id: productId,
            display_order: displayOrder
          }))
        )
      : Promise.resolve({error: null})
  ]);

  return relationWrites.every(({error}) => !error);
}

async function blogPublishBlockers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  postId: string
) {
  const issueResult = await supabase.rpc('blog_publish_issues', {
    target_post_id: postId
  });
  if (issueResult.error || !issueResult.data) {
    return null;
  }
  return mapBlogPublishIssues(issueResult.data);
}

export async function saveBlogPostDraftAction(input: BlogPostDraftInput): Promise<SaveBlogPostResult> {
  const admin = await requireAdmin();
  const parsed = blogPostDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', issues: validationIssues(parsed.error)};
  }

  const draft = parsed.data;
  const supabase = await createSupabaseServerClient();
  const publishedAt = draft.status === 'published' ? draft.publishedAt : null;
  const postResult = draft.postId
    ? await supabase
        .from('blog_posts')
        .update({
          status: draft.status,
          category_id: draft.categoryId,
          published_at: publishedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', draft.postId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('blog_posts')
        .insert({
          status: draft.status,
          category_id: draft.categoryId,
          published_at: publishedAt,
          created_by: admin.id
        })
        .select('id')
        .single();

  if (postResult.error || !postResult.data) {
    await recordBlogFailure({
      action: 'blog_save_post',
      errorCode: 'blog_save_failed',
      resultCode: 'save_failed',
      summary: 'Blog post save failed',
      referenceId: draft.postId,
      status: draft.status
    });
    return {status: 'error', code: 'save_failed'};
  }

  const postId = postResult.data.id;
  const translations = (['vi', 'en'] as const).map((locale) => {
    const translation = draft.translations[locale];
    return {
      post_id: postId,
      locale,
      slug: translation.slug,
      title: translation.title,
      description: translation.description,
      body: translation.body,
      seo_title: translation.seoTitle || null,
      seo_description: translation.seoDescription || null,
      social_image_bucket: translation.socialImageBucket,
      social_image_path: translation.socialImagePath
    };
  });

  const [{error: translationError}, relationsSaved] = await Promise.all([
    supabase.from('blog_post_translations').upsert(translations, {onConflict: 'post_id,locale'}),
    replaceBlogRelations(supabase, postId, draft)
  ]);

  if (translationError || !relationsSaved) {
    await recordBlogFailure({
      action: 'blog_save_relations',
      errorCode: 'blog_save_failed',
      resultCode: 'save_failed',
      summary: 'Blog post relation save failed',
      referenceId: postId,
      status: draft.status
    });
    return {status: 'error', code: 'save_failed'};
  }

  invalidateBlogCache();
  return {status: 'saved', postId};
}

export async function publishBlogPostAction(postId: string): Promise<PublishBlogPostResult> {
  await requireAdmin();
  const parsed = blogPostIdSchema.safeParse(postId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_post_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('publish_blog_post', {
    target_post_id: parsed.data,
    target_published_at: new Date().toISOString()
  });
  if (error || !data?.[0]) {
    await recordBlogFailure({
      action: 'blog_publish',
      errorCode: 'blog_publish_failed',
      resultCode: 'publish_failed',
      summary: 'Blog post publish failed',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'publish_failed'};
  }

  if (data[0].published) {
    invalidateBlogCache();
    return {status: 'published', postId: parsed.data};
  }

  const issues = await blogPublishBlockers(supabase, parsed.data);
  if (!issues) {
    await recordBlogFailure({
      action: 'blog_publish_issues',
      errorCode: 'blog_publish_failed',
      resultCode: 'publish_failed',
      summary: 'Blog post publish issue lookup failed',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'publish_failed'};
  }

  return {status: 'blocked', postId: parsed.data, issues};
}

export async function scheduleBlogPostAction(
  postId: string,
  publishedAt: string
): Promise<ScheduleBlogPostResult> {
  await requireAdmin();
  const parsedPostId = blogPostIdSchema.safeParse(postId);
  const parsedDate = blogPostDraftSchema.shape.publishedAt.safeParse(publishedAt);
  if (!parsedPostId.success || !parsedDate.success || !parsedDate.data) {
    return {status: 'invalid', code: 'invalid_schedule'};
  }

  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('publish_blog_post', {
    target_post_id: parsedPostId.data,
    target_published_at: parsedDate.data
  });
  if (error || !data?.[0]) {
    await recordBlogFailure({
      action: 'blog_schedule',
      errorCode: 'blog_schedule_failed',
      resultCode: 'schedule_failed',
      summary: 'Blog post schedule failed',
      referenceId: parsedPostId.data
    });
    return {status: 'error', code: 'schedule_failed'};
  }

  if (data[0].published) {
    invalidateBlogCache();
    return {status: 'scheduled', postId: parsedPostId.data, publishedAt: parsedDate.data};
  }

  const issues = await blogPublishBlockers(supabase, parsedPostId.data);
  if (!issues) {
    await recordBlogFailure({
      action: 'blog_schedule_issues',
      errorCode: 'blog_schedule_failed',
      resultCode: 'schedule_failed',
      summary: 'Blog post schedule issue lookup failed',
      referenceId: parsedPostId.data
    });
    return {status: 'error', code: 'schedule_failed'};
  }

  return {status: 'blocked', postId: parsedPostId.data, issues};
}

export async function unpublishBlogPostAction(postId: string): Promise<UnpublishBlogPostResult> {
  await requireAdmin();
  const parsed = blogPostIdSchema.safeParse(postId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_post_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('blog_posts')
    .update({status: 'draft', published_at: null, updated_at: new Date().toISOString()})
    .eq('id', parsed.data);

  if (error) {
    await recordBlogFailure({
      action: 'blog_unpublish',
      errorCode: 'blog_unpublish_failed',
      resultCode: 'unpublish_failed',
      summary: 'Blog post unpublish failed',
      referenceId: parsed.data
    });
    return {status: 'error', code: 'unpublish_failed'};
  }

  invalidateBlogCache();
  return {status: 'unpublished', postId: parsed.data};
}
