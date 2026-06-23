import {z} from 'zod';

const uuidSchema = z.uuid();
const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const localizedPostSchema = z.object({
  slug: slugSchema.max(200),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  socialImageBucket: z.string().trim().min(1).nullable(),
  socialImagePath: z.string().trim().min(1).nullable()
});

export const blogPostDraftSchema = z.object({
  postId: uuidSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  categoryId: uuidSchema.nullable(),
  publishedAt: z.iso.datetime().nullable(),
  translations: z.object({
    vi: localizedPostSchema,
    en: localizedPostSchema
  }),
  tagIds: z.array(uuidSchema),
  relatedProducts: z.array(
    z.object({
      productId: uuidSchema,
      displayOrder: z.number().int().nonnegative()
    })
  )
});

export const blogPostIdSchema = uuidSchema;

export type BlogPostDraftInput = z.input<typeof blogPostDraftSchema>;
export type BlogPostDraft = z.output<typeof blogPostDraftSchema>;
export type BlogLocale = 'vi' | 'en';
