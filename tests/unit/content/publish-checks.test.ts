import {describe, expect, it} from 'vitest';

import {mapBlogPublishIssues} from '@/content/blog/publish-checks';

describe('blog publish issue mapping - BLOG-01 BLOG-02 D-03', () => {
  it('maps database issue codes to stable admin blocker fields', () => {
    expect(
      mapBlogPublishIssues([
        {issue_code: 'missing_category', locale: null, detail: 'raw detail'},
        {issue_code: 'missing_slug', locale: 'vi', detail: 'raw detail'},
        {issue_code: 'missing_social_image', locale: 'en', detail: 'raw detail'}
      ])
    ).toEqual([
      {
        code: 'missing_category',
        group: 'taxonomy',
        field: 'categoryId'
      },
      {
        code: 'missing_slug',
        group: 'translation',
        field: 'slug',
        locale: 'vi'
      },
      {
        code: 'missing_social_image',
        group: 'media',
        field: 'socialImage',
        locale: 'en'
      }
    ]);
  });

  it('maps unknown database codes to a generic blocker without raw details', () => {
    expect(
      mapBlogPublishIssues([
        {
          issue_code: 'internal_admin_policy_name',
          locale: null,
          detail: 'sensitive database payload'
        }
      ])
    ).toEqual([
      {
        code: 'publish_requirement',
        group: 'general',
        field: 'blogPost'
      }
    ]);
  });
});
