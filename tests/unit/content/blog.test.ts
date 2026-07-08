import {beforeEach, describe, expect, it, vi} from 'vitest';

const {createSupabaseServerClientMock, requireAdminMock, recordOperationalFailureMock} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireAdminMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth/guards', () => ({
  requireAdmin: requireAdminMock
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));
vi.mock('@/operations/errors', () => ({
  recordOperationalFailure: recordOperationalFailureMock
}));

import {
  publishBlogPostAction,
  saveBlogPostDraftAction,
  scheduleBlogPostAction,
  unpublishBlogPostAction
} from '@/content/blog/actions';
import {blogPostDraftSchema} from '@/content/blog/schemas';
import type {BlogPostDraftInput} from '@/content/blog/schemas';

const categoryId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';

function validDraft(): BlogPostDraftInput {
  return {
    status: 'draft' as const,
    categoryId,
    publishedAt: null,
    translations: {
      vi: {
        slug: 'huong-dan-moc-gau',
        title: 'Huong dan moc gau',
        description: 'Bai viet huong dan moc gau nho.',
        body: 'Noi dung bai viet tieng Viet.',
        seoTitle: 'Huong dan moc gau',
        seoDescription: 'Hoc cach moc gau nho.',
        socialImageBucket: 'blog-media',
        socialImagePath: 'blog/bear-vi.jpg'
      },
      en: {
        slug: 'crochet-bear-guide',
        title: 'Crochet bear guide',
        description: 'A guide for crocheting a small bear.',
        body: 'English blog post body.',
        seoTitle: 'Crochet bear guide',
        seoDescription: 'Learn to crochet a small bear.',
        socialImageBucket: 'blog-media',
        socialImagePath: 'blog/bear-en.jpg'
      }
    },
    tagIds: [],
    relatedProducts: [{productId, displayOrder: 0}]
  };
}

describe('blog post schema - BLOG-01 D-01 D-02', () => {
  it('accepts one shared bilingual post with shared taxonomy and schedule fields', () => {
    expect(blogPostDraftSchema.safeParse(validDraft()).success).toBe(true);
  });

  it('accepts a scheduled published timestamp on the shared post record', () => {
    const draft = validDraft();
    draft.status = 'published';
    draft.publishedAt = '2026-07-01T09:00:00.000Z';

    expect(blogPostDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('rejects invalid localized slugs and missing body content', () => {
    const draft = validDraft();
    draft.translations.en.slug = 'Crochet Bear';
    draft.translations.vi.body = '';

    expect(blogPostDraftSchema.safeParse(draft).success).toBe(false);
  });
});

describe('blog admin actions - BLOG-02 D-01 D-03', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: '11111111-1111-4111-8111-111111111111'});
  });

  it('checks admin authorization before opening a database client', async () => {
    requireAdminMock.mockRejectedValue(new Error('forbidden'));

    await expect(saveBlogPostDraftAction(validDraft())).rejects.toThrow('forbidden');

    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it('maps database publish blockers without returning raw issue details', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({data: [{published: false}], error: null})
      .mockResolvedValueOnce({
        data: [
          {issue_code: 'missing_category', locale: null, detail: 'category is required'},
          {issue_code: 'missing_social_image', locale: 'en', detail: 'raw storage path detail'},
          {issue_code: 'unexpected_internal_code', locale: null, detail: 'do not expose this'}
        ],
        error: null
      });
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    const result = await publishBlogPostAction('44444444-4444-4444-8444-444444444444');

    expect(result).toEqual({
      status: 'blocked',
      postId: '44444444-4444-4444-8444-444444444444',
      issues: [
        {code: 'missing_category', group: 'taxonomy', field: 'categoryId'},
        {code: 'missing_social_image', group: 'media', field: 'socialImage', locale: 'en'},
        {code: 'publish_requirement', group: 'general', field: 'blogPost'}
      ]
    });
  });

  it('records publish RPC failures without exposing raw database details', async () => {
    const postId = '44444444-4444-4444-8444-444444444444';
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'relation private.blog_secret does not exist'}
    });
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(publishBlogPostAction(postId)).resolves.toEqual({
      status: 'error',
      code: 'publish_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'blog_publish_failed',
        summary: 'Blog post publish failed',
        facts: expect.objectContaining({
          action: 'blog_publish',
          referenceId: postId,
          code: 'publish_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/blog_secret|relation|Crochet bear|huong-dan|storage|body/i);
  });

  it('records draft relation failures without exposing raw post content', async () => {
    const postId = '55555555-5555-4555-8555-555555555555';
    const postQuery = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({data: {id: postId}, error: null}))
        }))
      }))
    };
    const from = vi.fn((table: string) => {
      if (table === 'blog_posts') {
        return postQuery;
      }
      if (table === 'blog_post_tags') {
        return {delete: vi.fn(() => ({eq: vi.fn(async () => ({error: {message: 'private tag detail'}}))}))};
      }
      return {
        delete: vi.fn(() => ({eq: vi.fn(async () => ({error: null}))})),
        upsert: vi.fn(async () => ({error: null})),
        insert: vi.fn(async () => ({error: null}))
      };
    });
    createSupabaseServerClientMock.mockResolvedValue({from});

    await expect(saveBlogPostDraftAction(validDraft())).resolves.toEqual({
      status: 'error',
      code: 'save_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'blog_save_failed',
        summary: 'Blog post relation save failed',
        facts: expect.objectContaining({
          action: 'blog_save_relations',
          referenceId: postId,
          status: 'draft',
          code: 'save_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/Crochet bear|Huong dan|private tag|blog\/bear|seo|slug|body/i);
  });

  it('records schedule blocker lookup failures without exposing raw content', async () => {
    const postId = '66666666-6666-4666-8666-666666666666';
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({data: [{published: false}], error: null})
      .mockResolvedValueOnce({data: null, error: {message: 'raw issue lookup failed'}});
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(scheduleBlogPostAction(postId, '2026-07-01T09:00:00.000Z')).resolves.toEqual({
      status: 'error',
      code: 'schedule_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'blog_schedule_failed',
        summary: 'Blog post schedule issue lookup failed',
        facts: expect.objectContaining({
          action: 'blog_schedule_issues',
          referenceId: postId,
          code: 'schedule_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/raw issue lookup/i);
  });

  it('records unpublish failures with only the post reference', async () => {
    const postId = '77777777-7777-4777-8777-777777777777';
    const eq = vi.fn(async () => ({error: {message: 'unpublish constraint detail'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(unpublishBlogPostAction(postId)).resolves.toEqual({
      status: 'error',
      code: 'unpublish_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'blog_unpublish_failed',
        summary: 'Blog post unpublish failed',
        facts: expect.objectContaining({
          action: 'blog_unpublish',
          referenceId: postId,
          code: 'unpublish_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/unpublish constraint detail/i);
  });
});
