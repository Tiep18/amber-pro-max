import { describe, expect, it } from 'vitest';
import {
  isBlogLocaleDraftReady,
  mapBlogValidationIssues
} from '@/components/admin/blog/blog-form-validation';

describe('blog form validation feedback', () => {
  it('maps server paths to useful field messages and selects the first invalid locale', () => {
    expect(
      mapBlogValidationIssues([
        {
          path: 'translations.en.slug',
          code: 'Invalid string: must match pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/'
        },
        {
          path: 'translations.vi.title',
          code: 'Too small: expected string to have >=1 characters'
        },
        {
          path: 'translations.en.body',
          code: 'Too big: expected string to have <=50000 characters'
        }
      ])
    ).toEqual({
      fields: {
        'translations.en.slug': 'Use lowercase letters, numbers, and single hyphens only.',
        'translations.vi.title': 'Title is required.',
        'translations.en.body': 'Body must be 50,000 characters or fewer.'
      },
      firstLocale: 'en',
      firstPath: 'translations.en.slug'
    });
  });

  it('keeps non-localized relation errors available in the summary', () => {
    expect(mapBlogValidationIssues([{ path: 'tagIds.0', code: 'Invalid UUID' }])).toEqual({
      fields: { 'tagIds.0': 'Select a valid tag.' },
      firstLocale: null,
      firstPath: 'tagIds.0'
    });
  });

  it('does not mark a locale ready when its required body is empty', () => {
    const complete = {
      slug: 'complete-post',
      title: 'Complete post',
      description: 'A complete description',
      body: 'Full article body'
    };
    expect(isBlogLocaleDraftReady(complete)).toBe(true);
    expect(isBlogLocaleDraftReady({ ...complete, body: '' })).toBe(false);
  });
});
