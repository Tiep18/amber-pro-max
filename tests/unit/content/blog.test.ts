import {describe, expect, it} from 'vitest';

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
