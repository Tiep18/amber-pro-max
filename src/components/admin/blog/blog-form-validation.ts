import type { BlogLocale } from '@/content/blog/schemas';

export type BlogValidationIssue = { path: string; code: string };

export function isBlogLocaleDraftReady(translation: {
  slug: string;
  title: string;
  description: string;
  body: string;
}) {
  return Boolean(
    translation.slug.trim() &&
    translation.title.trim() &&
    translation.description.trim() &&
    translation.body.trim()
  );
}

const fieldLabels: Record<string, string> = {
  slug: 'Slug',
  title: 'Title',
  description: 'Description',
  body: 'Body',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  socialImageBucket: 'Social image bucket',
  socialImagePath: 'Social image path'
};

function issueMessage(issue: BlogValidationIssue) {
  const field = issue.path.split('.').at(-1) ?? '';
  if (issue.path.startsWith('tagIds.')) return 'Select a valid tag.';
  if (issue.path.startsWith('relatedProducts.')) return 'Select a valid related product and order.';
  if (field === 'slug' && /pattern|regex/i.test(issue.code))
    return 'Use lowercase letters, numbers, and single hyphens only.';
  if (/too small|>=1|min/i.test(issue.code))
    return `${fieldLabels[field] ?? 'This field'} is required.`;
  if (/too big|50000/i.test(issue.code) && field === 'body')
    return 'Body must be 50,000 characters or fewer.';
  if (/too big|500/i.test(issue.code)) return `${fieldLabels[field] ?? 'This field'} is too long.`;
  if (/too big|200/i.test(issue.code))
    return `${fieldLabels[field] ?? 'This field'} must be 200 characters or fewer.`;
  return issue.code || 'Review this field.';
}

export function mapBlogValidationIssues(issues: BlogValidationIssue[]) {
  const fields = Object.fromEntries(issues.map((issue) => [issue.path, issueMessage(issue)]));
  const firstPath = issues[0]?.path ?? null;
  const locale = firstPath?.match(/^translations\.(vi|en)\./)?.[1] as BlogLocale | undefined;
  return { fields, firstLocale: locale ?? null, firstPath };
}
