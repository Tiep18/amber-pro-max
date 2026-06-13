import {z} from 'zod';
import type {CurrencyCode, MarketCode} from './types';

const uuidSchema = z.uuid();

const attributesSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
        context.addIssue({code: 'custom', message: 'attributes_must_be_non_empty_object'});
        return z.NEVER;
      }
      return parsed as Record<string, string>;
    } catch {
      context.addIssue({code: 'custom', message: 'attributes_must_be_json'});
      return z.NEVER;
    }
  });

export const variantDraftSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema,
  sku: z.string().trim().min(1).max(120),
  attributes: attributesSchema,
  displayOrder: z.number().int().nonnegative(),
  mediaId: uuidSchema.nullable()
});

const marketCurrency: Record<MarketCode, CurrencyCode> = {
  vn: 'VND',
  intl: 'USD'
};

export const variantPriceOverrideSchema = z
  .object({
    variantId: uuidSchema,
    marketCode: z.enum(['vn', 'intl']),
    currencyCode: z.enum(['VND', 'USD']),
    priceMinor: z.number().int().nonnegative()
  })
  .superRefine((override, context) => {
    if (marketCurrency[override.marketCode] !== override.currencyCode) {
      context.addIssue({
        code: 'custom',
        path: ['currencyCode'],
        message: 'override_currency_must_match_market'
      });
    }
  });

export const removeVariantPriceOverrideSchema = z.object({
  variantId: uuidSchema,
  marketCode: z.enum(['vn', 'intl'])
});

export const removeVariantSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema
});

export const inventoryAdjustmentSchema = z.discriminatedUnion('ownerType', [
  z.object({
    ownerType: z.literal('product'),
    productId: uuidSchema,
    quantityOnHand: z.number().int().nonnegative()
  }),
  z.object({
    ownerType: z.literal('variant'),
    productId: uuidSchema,
    variantId: uuidSchema,
    quantityOnHand: z.number().int().nonnegative()
  })
]);

export type VariantDraftInput = z.input<typeof variantDraftSchema>;
export type VariantDraft = z.output<typeof variantDraftSchema>;
export type VariantPriceOverrideInput = z.input<typeof variantPriceOverrideSchema>;
export type RemoveVariantPriceOverrideInput = z.input<typeof removeVariantPriceOverrideSchema>;
export type RemoveVariantInput = z.input<typeof removeVariantSchema>;
export type InventoryAdjustmentInput = z.input<typeof inventoryAdjustmentSchema>;
