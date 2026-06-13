import {z} from 'zod';

export const PRODUCT_MEDIA_BUCKET = 'product-media';
export const PATTERN_PDF_BUCKET = 'pattern-pdfs';

export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PATTERN_PDF_BYTES = 50 * 1024 * 1024;

export const productImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const patternPdfMimeType = 'application/pdf';

export const productImageExtensions: Record<(typeof productImageMimeTypes)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const uuidSchema = z.uuid();
const localeSchema = z.enum(['vi', 'en']);

export const mediaIdSchema = uuidSchema;
export const mediaProductIdSchema = uuidSchema;
export const socialImageInputSchema = z.object({
  productId: uuidSchema,
  mediaId: uuidSchema,
  locale: localeSchema
});

export const primaryImageInputSchema = z.object({
  productId: uuidSchema,
  mediaId: uuidSchema
});

export const removeMediaInputSchema = primaryImageInputSchema;

export const mediaDetailsInputSchema = z.object({
  productId: uuidSchema,
  mediaId: uuidSchema,
  altTextVi: z.string().trim().max(500),
  altTextEn: z.string().trim().max(500),
  displayOrder: z.number().int().nonnegative()
});

export const pdfAssetInputSchema = z.object({
  productId: uuidSchema
});

export type CatalogMediaLocale = z.output<typeof localeSchema>;
export type MediaDetailsInput = z.output<typeof mediaDetailsInputSchema>;
