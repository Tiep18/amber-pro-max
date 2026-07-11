import type { PolicyLocale } from '@/policies/schemas';

export type PolicyValidationIssue = { path: string; code: string };

const labels: Record<string, string> = {
  slug: 'Slug',
  title: 'Title',
  summary: 'Summary',
  body: 'Body',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  socialImageBucket: 'Social image bucket',
  socialImagePath: 'Social image path'
};

export function isPolicyLocaleDraftReady(value: {
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}) {
  return Boolean(
    value.slug.trim() &&
    value.title.trim() &&
    value.summary.trim() &&
    value.body.trim() &&
    value.seoTitle.trim() &&
    value.seoDescription.trim()
  );
}

function messageFor(issue: PolicyValidationIssue) {
  const field = issue.path.split('.').at(-1) ?? '';
  if (field === 'slug' && /pattern|regex/i.test(issue.code))
    return 'Use lowercase letters, numbers, and single hyphens only.';
  if (/too small|>=1|min/i.test(issue.code)) return `${labels[field] ?? 'This field'} is required.`;
  if (/too big|50000/i.test(issue.code) && field === 'body')
    return 'Body must be 50,000 characters or fewer.';
  return issue.code || 'Review this field.';
}

export function mapPolicyValidationIssues(issues: PolicyValidationIssue[]) {
  const fields = Object.fromEntries(issues.map((issue) => [issue.path, messageFor(issue)]));
  const firstPath = issues[0]?.path ?? null;
  const locale = firstPath?.match(/^translations\.(vi|en)\./)?.[1] as PolicyLocale | undefined;
  return { fields, firstLocale: locale ?? null, firstPath };
}
