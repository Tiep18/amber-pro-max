import { describe, expect, it } from 'vitest';
import {
  parseWishlistProductIds,
  selectionAfterWishlistResult,
  wishlistFeedbackAfterResult
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

  it('returns user-visible feedback for failed wishlist mutations', () => {
    const labels = {
      signedOut: 'Sign in to save wishlist items.',
      invalid: 'This product cannot be saved.',
      failed: 'We could not update your wishlist. Try again.'
    };

    expect(
      wishlistFeedbackAfterResult({ status: 'error', code: 'wishlist_action_failed' }, labels)
    ).toBe(labels.failed);
    expect(
      wishlistFeedbackAfterResult(
        {
          status: 'error',
          code: 'wishlist_action_failed',
          errorId: '76000000-0000-4000-8000-000000000001'
        },
        labels
      )
    ).toBe(`${labels.failed} Error ID: 76000000-0000-4000-8000-000000000001`);
    expect(
      wishlistFeedbackAfterResult({ status: 'invalid', code: 'invalid_product_id' }, labels)
    ).toBe(labels.invalid);
    expect(
      wishlistFeedbackAfterResult({ status: 'unauthenticated', redirectTo: '/en/sign-in' }, labels)
    ).toBe(labels.signedOut);
    expect(wishlistFeedbackAfterResult({ status: 'saved' }, labels)).toBeUndefined();
  });
});
