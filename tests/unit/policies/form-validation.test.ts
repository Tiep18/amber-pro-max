import { describe, expect, it } from 'vitest';
import {
  isPolicyLocaleDraftReady,
  mapPolicyValidationIssues
} from '@/components/admin/policies/policy-form-validation';

describe('policy form validation feedback', () => {
  it('maps localized server issues and selects the first invalid locale', () => {
    expect(
      mapPolicyValidationIssues([
        { path: 'translations.en.slug', code: 'Invalid string: must match pattern' },
        { path: 'translations.vi.body', code: 'Too small: expected string to have >=1 characters' }
      ])
    ).toEqual({
      fields: {
        'translations.en.slug': 'Use lowercase letters, numbers, and single hyphens only.',
        'translations.vi.body': 'Body is required.'
      },
      firstLocale: 'en',
      firstPath: 'translations.en.slug'
    });
  });

  it('requires every draft field enforced by the schema', () => {
    const complete = {
      slug: 'privacy',
      title: 'Privacy',
      summary: 'Summary',
      body: 'Body',
      seoTitle: 'Privacy',
      seoDescription: 'Search summary'
    };
    expect(isPolicyLocaleDraftReady(complete)).toBe(true);
    expect(isPolicyLocaleDraftReady({ ...complete, seoDescription: '' })).toBe(false);
  });
});
