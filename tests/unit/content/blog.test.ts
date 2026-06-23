import {beforeEach, describe, expect, it, vi} from 'vitest';

const {createSupabaseServerClientMock, requireAdminMock} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireAdminMock: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth/guards', () => ({
  requireAdmin: requireAdminMock
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));

import {publishBlogPostAction, saveBlogPostDraftAction} from '@/content/blog/actions';
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
});
