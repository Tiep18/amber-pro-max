import {z} from 'zod';

const uuidSchema = z.uuid();
const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const policyKindSchema = z.enum(['privacy', 'terms_of_sale', 'returns', 'digital_downloads']);

const localizedPolicySchema = z.object({
  slug: slugSchema.max(200),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  seoTitle: z.string().trim().min(1).max(200),
  seoDescription: z.string().trim().min(1).max(500),
  socialImageBucket: z.string().trim().min(1).nullable(),
  socialImagePath: z.string().trim().min(1).nullable()
});

export const policyDraftSchema = z.object({
  policyId: uuidSchema.optional(),
  policyKind: policyKindSchema,
  translations: z.object({
    vi: localizedPolicySchema,
    en: localizedPolicySchema
  })
});

export const policyIdSchema = uuidSchema;

export type PolicyKind = z.output<typeof policyKindSchema>;
export type PolicyDraftInput = z.input<typeof policyDraftSchema>;
export type PolicyDraft = z.output<typeof policyDraftSchema>;
export type PolicyLocale = 'vi' | 'en';
