import {z} from 'zod';

const uuidSchema = z.uuid();
const slugSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    'invalid_slug'
  );

const specificationsSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    try {
      const parsed = value.length === 0 ? {} : JSON.parse(value);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        context.addIssue({code: 'custom', message: 'specifications_must_be_object'});
        return z.NEVER;
      }
      return parsed as Record<string, unknown>;
    } catch {
      context.addIssue({code: 'custom', message: 'specifications_must_be_json'});
      return z.NEVER;
    }
  });

const translationSchema = z.object({
  title: z.string().trim().max(200),
  description: z.string().trim().max(20_000),
  specifications: specificationsSchema,
  slug: slugSchema.max(200),
  seoTitle: z.string().trim().max(200),
  seoDescription: z.string().trim().max(500)
});

const offerSchema = z.object({
  enabled: z.boolean(),
  priceMinor: z.number().int().nonnegative().nullable()
});

export const productDraftSchema = z.object({
  productId: uuidSchema.optional(),
  productType: z.enum(['pdf_pattern', 'physical_finished']),
  translations: z.object({
    vi: translationSchema,
    en: translationSchema
  }),
  categoryIds: z.array(uuidSchema),
  techniqueIds: z.array(uuidSchema),
  tagIds: z.array(uuidSchema),
  collections: z.array(
    z.object({
      collectionId: uuidSchema,
      displayOrder: z.number().int().nonnegative()
    })
  ),
  offers: z.object({
    vn: offerSchema,
    intl: offerSchema
  })
});

export const productIdSchema = uuidSchema;

export type ProductDraftInput = z.input<typeof productDraftSchema>;
export type ProductDraft = z.output<typeof productDraftSchema>;
