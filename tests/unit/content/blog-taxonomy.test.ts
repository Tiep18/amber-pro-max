import {describe, expect, it} from 'vitest';

import {blogPostDraftSchema} from '@/content/blog/schemas';

function draftWithTaxonomy() {
  return {
    categoryId: '22222222-2222-4222-8222-222222222222',
    publishedAt: null,
    translations: {
      vi: {
        slug: 'bai-viet-amigurumi',
        title: 'Bai viet amigurumi',
        description: 'Mo ta ngan.',
        body: 'Noi dung.',
        socialImageBucket: 'blog-media',
        socialImagePath: 'blog/vi.jpg'
      },
      en: {
        slug: 'amigurumi-post',
        title: 'Amigurumi post',
        description: 'Short description.',
        body: 'Body.',
        socialImageBucket: 'blog-media',
        socialImagePath: 'blog/en.jpg'
      }
    },
    tagIds: ['33333333-3333-4333-8333-333333333333'],
    relatedProducts: [
      {
        productId: '44444444-4444-4444-8444-444444444444',
        displayOrder: 1
      }
    ]
  };
}

describe('blog taxonomy schema - BLOG-02 D-03', () => {
  it('requires a category for publish-ready blog input', () => {
    expect(blogPostDraftSchema.safeParse(draftWithTaxonomy()).success).toBe(true);
  });

  it('allows optional tags and related products', () => {
    const draft = draftWithTaxonomy();
    draft.tagIds = [];
    draft.relatedProducts = [];

    expect(blogPostDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('rejects invalid related product identifiers', () => {
    const draft = draftWithTaxonomy();
    draft.relatedProducts[0].productId = 'not-a-uuid';

    expect(blogPostDraftSchema.safeParse(draft).success).toBe(false);
  });
});
