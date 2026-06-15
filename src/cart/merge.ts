import {
  cartIntentLineSchema,
  cartLineKey,
  maxCartQuantity,
  type CartIntentLine,
  type CartMergeChange,
  type CartMergeResult,
  type CartQuantityCaps
} from './types';

type MergeInput = {
  baseLines: unknown[];
  incomingLines: unknown[];
  quantityCaps?: CartQuantityCaps;
  now: string;
};

function capFor(line: CartIntentLine, caps: CartQuantityCaps) {
  return caps[cartLineKey(line)] ?? caps[line.productId] ?? maxCartQuantity;
}

function parseLines(lines: unknown[], changes: CartMergeChange[]) {
  return lines.flatMap((line) => {
    const parsed = cartIntentLineSchema.safeParse(line);
    if (!parsed.success) {
      changes.push({type: 'not_merged', reason: 'invalid_intent', line});
      return [];
    }
    return [parsed.data];
  });
}

export function mergeCartIntents({
  baseLines,
  incomingLines,
  quantityCaps = {},
  now
}: MergeInput): CartMergeResult {
  const changes: CartMergeChange[] = [];
  const merged = new Map<string, CartIntentLine>();

  for (const line of parseLines(baseLines, changes)) {
    merged.set(cartLineKey(line), line);
  }

  for (const incoming of parseLines(incomingLines, changes)) {
    const key = cartLineKey(incoming);
    const existing = merged.get(key);
    const previousQuantity = existing?.quantity ?? 0;
    const requestedQuantity = previousQuantity + incoming.quantity;
    const cap = capFor(incoming, quantityCaps);

    if (cap < 1) {
      changes.push({type: 'not_merged', reason: 'quantity_cap_zero', line: incoming});
      continue;
    }

    const finalQuantity = Math.min(requestedQuantity, cap, maxCartQuantity);
    const nextLine: CartIntentLine = {
      ...incoming,
      addedAt: existing?.addedAt ?? incoming.addedAt,
      updatedAt: now,
      quantity: finalQuantity
    };
    merged.set(key, nextLine);

    if (!existing) {
      changes.push({
        type: 'added_line',
        productId: incoming.productId,
        variantId: incoming.variantId ?? null,
        finalQuantity
      });
    } else if (finalQuantity < requestedQuantity) {
      changes.push({
        type: 'quantity_capped',
        productId: incoming.productId,
        variantId: incoming.variantId ?? null,
        previousQuantity,
        requestedQuantity,
        finalQuantity,
        cap: Math.min(cap, maxCartQuantity)
      });
    } else {
      changes.push({
        type: 'combined_quantity',
        productId: incoming.productId,
        variantId: incoming.variantId ?? null,
        previousQuantity,
        requestedQuantity,
        finalQuantity
      });
    }
  }

  return {lines: Array.from(merged.values()), changes};
}
