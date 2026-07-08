import { describe, expect, it } from 'vitest';
import {
  parseWishlistProductIds,
  selectionAfterWishlistResult
} from '@/account/wishlist-client-state';

const firstId = '33333333-3333-4333-8333-333333333333';
const secondId = '44444444-4444-4444-8444-444444444444';
const postgresId = '50000000-0000-0000-0000-000000000003';

describe('wishlist client state', () => {
  it('accepts a bounded, deduplicated UUID batch', () => {
    expect(parseWishlistProductIds(`${firstId},${secondId},${firstId}`)).toEqual([
      firstId,
      secondId
    ]);
  });

  it('accepts PostgreSQL UUIDs that are not RFC-versioned', () => {
    expect(parseWishlistProductIds(`${postgresId},${firstId}`)).toEqual([postgresId, firstId]);
  });

  it('rejects malformed or oversized batches', () => {
    expect(parseWishlistProductIds('not-a-uuid')).toEqual([]);
    expect(parseWishlistProductIds(Array.from({ length: 101 }, () => firstId).join(','))).toEqual(
      []
    );
  });

  it('commits successful add and remove results without retaining stale action state', () => {
    expect(selectionAfterWishlistResult(false, true, { status: 'saved' })).toBe(true);
    expect(selectionAfterWishlistResult(true, false, { status: 'removed' })).toBe(false);
    expect(selectionAfterWishlistResult(true, false, { status: 'not_found' })).toBe(false);
  });

  it('rolls an unsuccessful optimistic toggle back to its previous state', () => {
    expect(
      selectionAfterWishlistResult(false, true, {
        status: 'error',
        code: 'wishlist_action_failed'
      })
    ).toBe(false);
  });
});
