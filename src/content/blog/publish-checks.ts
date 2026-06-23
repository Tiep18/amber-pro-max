import type {BlogLocale} from './schemas';

export type BlogPublishIssueCode =
  | 'missing_category'
  | 'missing_translation'
  | 'missing_slug'
  | 'missing_title'
  | 'missing_description'
  | 'missing_social_image';

export type BlogPublishBlockerCode = BlogPublishIssueCode | 'publish_requirement';
export type BlogPublishBlockerGroup = 'taxonomy' | 'translation' | 'media' | 'general';

export type BlogPublishBlocker = {
  code: BlogPublishBlockerCode;
  group: BlogPublishBlockerGroup;
  field: string;
  locale?: BlogLocale;
};

export type DatabaseBlogPublishIssue = {
  issue_code: string;
  locale: string | null;
  detail: string | null;
};

const issueMap: Record<
  BlogPublishIssueCode,
  {group: BlogPublishBlockerGroup; field: string}
> = {
  missing_category: {group: 'taxonomy', field: 'categoryId'},
  missing_translation: {group: 'translation', field: 'translation'},
  missing_slug: {group: 'translation', field: 'slug'},
  missing_title: {group: 'translation', field: 'title'},
  missing_description: {group: 'translation', field: 'description'},
  missing_social_image: {group: 'media', field: 'socialImage'}
};

function isLocale(value: string | null): value is BlogLocale {
  return value === 'vi' || value === 'en';
}

function isBlogIssueCode(value: string): value is BlogPublishIssueCode {
  return value in issueMap;
}

export function mapBlogPublishIssues(
  issues: DatabaseBlogPublishIssue[]
): BlogPublishBlocker[] {
  return issues.map((issue) => {
    if (!isBlogIssueCode(issue.issue_code)) {
      return {
        code: 'publish_requirement',
        group: 'general',
        field: 'blogPost'
      };
    }

    const mapped = issueMap[issue.issue_code];
    return {
      code: issue.issue_code,
      group: mapped.group,
      field: mapped.field,
      ...(isLocale(issue.locale) ? {locale: issue.locale} : {})
    };
  });
}
