import {z} from 'zod';
import type {MarketCode} from '@/catalog/market';

export const guestCartVersion = 1;
export const guestCartTtlDays = 30;
export const maxCartQuantity = 99;

export const cartIntentLineSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional().default(null),
  quantity: z.number().int().min(1).max(maxCartQuantity),
  marketAtAdd: z.enum(['vn', 'intl']),
  addedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const guestCartIntentSchema = z.object({
  version: z.literal(guestCartVersion),
  updatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  lines: z.array(cartIntentLineSchema).max(100)
});

export type CartIntentLine = z.infer<typeof cartIntentLineSchema>;
export type GuestCartIntent = z.infer<typeof guestCartIntentSchema>;

export type CartActor =
  | {type: 'guest'; deviceCartId?: string}
  | {type: 'account'; userId: string; accountCartId: string};

export type AccountCartLine = CartIntentLine & {
  accountCartLineId: string;
};

export type AccountCartState = {
  accountCartId: string;
  userId: string;
  updatedAt: string;
  lines: AccountCartLine[];
};

export type CartLineKey = `${string}::${string}`;

export type CartMergeChange =
  | {
      type: 'added_line';
      productId: string;
      variantId: string | null;
      finalQuantity: number;
    }
  | {
      type: 'combined_quantity';
      productId: string;
      variantId: string | null;
      previousQuantity: number;
      requestedQuantity: number;
      finalQuantity: number;
    }
  | {
      type: 'quantity_capped';
      productId: string;
      variantId: string | null;
      previousQuantity: number;
      requestedQuantity: number;
      finalQuantity: number;
      cap: number;
    }
  | {
      type: 'not_merged';
      reason: 'invalid_intent' | 'quantity_cap_zero';
      line: unknown;
    };

export type CartMergeResult = {
  lines: CartIntentLine[];
  changes: CartMergeChange[];
};

export type CartQuantityCaps = Record<string, number>;

export type CartIntentWriteInput = {
  lines: Array<Record<string, unknown> | CartIntentLine>;
};

export type AddToCartIntent = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  marketAtAdd: MarketCode;
};

export function cartLineKey(line: Pick<CartIntentLine, 'productId' | 'variantId'>): CartLineKey {
  return `${line.productId}::${line.variantId ?? 'product'}`;
}
