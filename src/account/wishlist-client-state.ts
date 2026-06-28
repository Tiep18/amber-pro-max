import { z } from 'zod';
import type { WishlistActionState } from './wishlist-actions';

const productIdSchema = z.string().uuid();
const MAX_WISHLIST_BATCH_SIZE = 100;

export function parseWishlistProductIds(value: string | null) {
  if (!value) return [];
  const values = value.split(',').filter(Boolean);
  if (values.length > MAX_WISHLIST_BATCH_SIZE) return [];
  const parsed = z.array(productIdSchema).safeParse(values);
  return parsed.success ? [...new Set(parsed.data)] : [];
}

export function selectionAfterWishlistResult(
  previous: boolean,
  intended: boolean,
  result: WishlistActionState
) {
  if (result.status === 'saved') return true;
  if (result.status === 'removed' || result.status === 'not_found') return false;
  return previous;
}
