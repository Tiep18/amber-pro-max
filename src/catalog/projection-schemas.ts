import { z } from 'zod';

const localeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.enum(['vi', 'en'])
);
const surfaceSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.enum(['home', 'catalog', 'category', 'collection', 'technique', 'tag'])
);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? undefined : normalized;
  }, z.string().max(maxLength).optional());

const optionalSlug = optionalTrimmedString(100).refine(
  (value) => value === undefined || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  'invalid_slug'
);

const requiredSlug = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'invalid_slug')
);

export const catalogProjectionQuerySchema = z.strictObject({
  locale: localeSchema,
  surface: surfaceSchema,
  search: optionalTrimmedString(100),
  productType: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.enum(['pdf_pattern', 'physical_finished']).optional()
  ),
  categorySlug: optionalSlug,
  collectionSlug: optionalSlug,
  techniqueSlug: optionalSlug,
  tagSlug: optionalSlug,
  sort: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.enum(['newest', 'price_asc', 'price_desc', 'title']).default('newest')
  ),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(24)
});

export const productProjectionParamsSchema = z.strictObject({
  locale: localeSchema,
  productSlug: requiredSlug
});

export type CatalogProjectionQuery = z.output<typeof catalogProjectionQuerySchema>;
export type ProductProjectionParams = z.output<typeof productProjectionParamsSchema>;
