import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireUser: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: vi.fn()}));

import {
  canReviewProduct,
  mapPublicReviewRows,
  maskReviewIdentity,
  parseProductReviewInput
} from '@/reviews/eligibility';
import {
  moderateProductReview,
  removeReviewReply,
  upsertReviewReply
} from '@/reviews/actions';

const productId = '33333333-3333-4333-8333-333333333333';

describe('verified product review contracts (REV-01, D-09, D-10, D-11)', () => {
  test('checks eligibility through server/database evidence only', async () => {
    const client = {rpc: vi.fn(() => Promise.resolve({data: true, error: null}))};

    await expect(canReviewProduct({productId, client: client as never})).resolves.toEqual({
      status: 'eligible'
    });

    expect(client.rpc).toHaveBeenCalledWith('can_review_product', {p_product_id: productId});
  });

  test('rejects browser-submitted verifiedPurchase flags and invalid ratings', () => {
    expect(parseProductReviewInput({rating: 5, title: 'Nice', body: 'Well made', verifiedPurchase: true})).toEqual({
      success: false,
      code: 'client_verified_purchase_not_allowed'
    });
    expect(parseProductReviewInput({rating: 0, title: 'No', body: 'No'})).toEqual({
      success: false,
      code: 'invalid_review'
    });
  });

  test('accepts one to five integer ratings with trimmed optional content', () => {
    expect(parseProductReviewInput({rating: 5, title: '  Sweet  ', body: '  Well made  '})).toEqual({
      success: true,
      data: {rating: 5, title: 'Sweet', body: 'Well made'}
    });
  });

  test('maps missing or unpaid eligibility as not eligible', async () => {
    const client = {rpc: vi.fn(() => Promise.resolve({data: false, error: null}))};

    await expect(canReviewProduct({productId, client: client as never})).resolves.toEqual({
      status: 'not_eligible'
    });
  });

  test('masks public identity and exposes approved verified reviews only', () => {
    expect(maskReviewIdentity('taylor.customer@example.com')).toBe('t***@example.com');
    expect(maskReviewIdentity('bad-email')).toBe('Customer');

    expect(mapPublicReviewRows([
      {
        product_id: productId,
        rating: 5,
        title: 'Sweet',
        body: 'Well made',
        masked_author: 't***@example.com',
        verified_purchase: true,
        approved_at: '2026-06-21T00:00:00.000Z'
      },
      {
        product_id: productId,
        rating: 4,
        title: 'Pending',
        body: 'Hidden',
        masked_author: 'full@example.com',
        verified_purchase: true,
        approved_at: null
      }
    ])).toEqual([
      expect.objectContaining({
        rating: 5,
        maskedAuthor: 't***@example.com',
        verifiedPurchase: true
      })
    ]);
  });
});

describe('admin review moderation contracts (REV-02, D-12)', () => {
  test('approve and hide send expected version and status to the moderation RPC', async () => {
    const client = {
      rpc: vi.fn()
        .mockResolvedValueOnce({data: {status: 'approved', version: 3}, error: null})
        .mockResolvedValueOnce({data: {status: 'hidden', version: 4}, error: null})
    };

    await expect(moderateProductReview({
      reviewId: productId,
      expectedVersion: 2,
      expectedStatus: 'pending',
      targetStatus: 'approved'
    }, client)).resolves.toEqual({status: 'approved', version: 3});
    await expect(moderateProductReview({
      reviewId: productId,
      expectedVersion: 3,
      expectedStatus: 'approved',
      targetStatus: 'hidden'
    }, client)).resolves.toEqual({status: 'hidden', version: 4});

    expect(client.rpc).toHaveBeenNthCalledWith(1, 'moderate_product_review', expect.objectContaining({
      p_expected_version: 2,
      p_expected_status: 'pending',
      p_target_status: 'approved'
    }));
  });

  test('moderation maps stale and forbidden results without treating them as success', async () => {
    const client = {
      rpc: vi.fn()
        .mockResolvedValueOnce({data: {status: 'stale', version: 7}, error: null})
        .mockResolvedValueOnce({data: {status: 'forbidden'}, error: null})
    };
    const input = {
      reviewId: productId,
      expectedVersion: 2,
      expectedStatus: 'pending' as const,
      targetStatus: 'approved' as const
    };

    await expect(moderateProductReview(input, client)).resolves.toEqual({status: 'stale', version: 7});
    await expect(moderateProductReview(input, client)).resolves.toEqual({status: 'forbidden'});
  });

  test('shop reply create and edit use one upsert action with stale review checks', async () => {
    const client = {rpc: vi.fn().mockResolvedValue({data: {status: 'saved', reply_version: 2}, error: null})};

    await expect(upsertReviewReply({
      reviewId: productId,
      expectedReviewVersion: 3,
      expectedReviewStatus: 'approved',
      body: 'Thank you for your review.'
    }, client)).resolves.toEqual({status: 'saved', replyVersion: 2});

    expect(client.rpc).toHaveBeenCalledWith('upsert_review_admin_reply', expect.objectContaining({
      p_expected_review_version: 3,
      p_expected_review_status: 'approved',
      p_body: 'Thank you for your review.'
    }));
  });

  test('shop reply removal maps removed, stale, and forbidden results', async () => {
    const client = {
      rpc: vi.fn()
        .mockResolvedValueOnce({data: {status: 'removed'}, error: null})
        .mockResolvedValueOnce({data: {status: 'stale', version: 4}, error: null})
        .mockResolvedValueOnce({data: {status: 'forbidden'}, error: null})
    };
    const input = {
      reviewId: productId,
      expectedReviewVersion: 3,
      expectedReviewStatus: 'approved' as const,
      expectedReplyVersion: 1
    };

    await expect(removeReviewReply(input, client)).resolves.toEqual({status: 'removed'});
    await expect(removeReviewReply(input, client)).resolves.toEqual({status: 'stale', version: 4});
    await expect(removeReviewReply(input, client)).resolves.toEqual({status: 'forbidden'});
  });
});
