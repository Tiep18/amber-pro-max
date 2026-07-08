import type { WishlistActionState } from './wishlist-actions';

const postgresUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WISHLIST_BATCH_SIZE = 100;

export function isPostgresUuid(value: string) {
  return postgresUuidPattern.test(value);
}

export function parseWishlistProductIds(value: string | null) {
  if (!value) return [];
  const values = value.split(',').filter(Boolean);
  if (values.length > MAX_WISHLIST_BATCH_SIZE) return [];
  return values.every(isPostgresUuid) ? [...new Set(values)] : [];
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
