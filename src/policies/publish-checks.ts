import type {PolicyLocale} from './schemas';

export type PolicyPublishIssueCode =
  | 'missing_translation'
  | 'missing_slug'
  | 'missing_title'
  | 'missing_summary'
  | 'missing_body'
  | 'missing_seo_title'
  | 'missing_seo_description'
  | 'missing_social_image';

export type PolicyPublishBlockerCode = PolicyPublishIssueCode | 'publish_requirement';
export type PolicyPublishBlockerGroup = 'translation' | 'seo' | 'media' | 'general';

export type PolicyPublishBlocker = {
  code: PolicyPublishBlockerCode;
  group: PolicyPublishBlockerGroup;
  field: string;
  locale?: PolicyLocale;
};

export type DatabasePolicyPublishIssue = {
  issue_code: string;
  locale: string | null;
  detail: string | null;
};

const issueMap: Record<PolicyPublishIssueCode, {group: PolicyPublishBlockerGroup; field: string}> = {
  missing_translation: {group: 'translation', field: 'translation'},
  missing_slug: {group: 'translation', field: 'slug'},
  missing_title: {group: 'translation', field: 'title'},
  missing_summary: {group: 'translation', field: 'summary'},
  missing_body: {group: 'translation', field: 'body'},
  missing_seo_title: {group: 'seo', field: 'seoTitle'},
  missing_seo_description: {group: 'seo', field: 'seoDescription'},
  missing_social_image: {group: 'media', field: 'socialImage'}
};

function isLocale(value: string | null): value is PolicyLocale {
  return value === 'vi' || value === 'en';
}

function isPolicyIssueCode(value: string): value is PolicyPublishIssueCode {
  return value in issueMap;
}

export function mapPolicyPublishIssues(issues: DatabasePolicyPublishIssue[]): PolicyPublishBlocker[] {
  return issues.map((issue) => {
    if (!isPolicyIssueCode(issue.issue_code)) {
      return {code: 'publish_requirement', group: 'general', field: 'policy'};
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
