import { cartLineKey, type CartIntentLine } from './types';

export type CompletedOrderLine = Pick<CartIntentLine, 'productId' | 'variantId' | 'quantity'>;

export function subtractCompletedOrderLines({
  currentLines,
  completedLines,
  updatedAt
}: {
  currentLines: CartIntentLine[];
  completedLines: CompletedOrderLine[];
  updatedAt: string;
}) {
  const completedQuantityByLine = new Map<string, number>();

  for (const line of completedLines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const key = cartLineKey({ ...line, variantId: line.variantId ?? null });
    completedQuantityByLine.set(key, (completedQuantityByLine.get(key) ?? 0) + line.quantity);
  }

  return currentLines.flatMap((line) => {
    const completedQuantity = completedQuantityByLine.get(cartLineKey(line)) ?? 0;
    if (completedQuantity <= 0) return [line];

    const remainingQuantity = line.quantity - completedQuantity;
    return remainingQuantity > 0 ? [{ ...line, quantity: remainingQuantity, updatedAt }] : [];
  });
}
