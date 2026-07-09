import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireUser: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: vi.fn()}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {
  canReviewProduct,
  mapPublicReviewRows,
  maskReviewIdentity,
  parseProductReviewInput
} from '@/reviews/eligibility';
import {
  moderateProductReview,
  removeReviewReply,
  submitProductReview,
  upsertReviewReply
} from '@/reviews/actions';
import {getAdminProductReviews, getApprovedProductReviews} from '@/reviews/queries';
import {recordOperationalFailure} from '@/operations/errors';

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

  test('records eligibility RPC failures without exposing database details', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const client = {
      rpc: vi.fn(() => Promise.resolve({data: null, error: {message: 'private eligibility relation failed'}}))
    };

    await expect(canReviewProduct({productId, client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'review_eligibility_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'review_eligibility_failed',
        summary: 'Review eligibility check failed',
        facts: expect.objectContaining({
          action: 'review_eligibility',
          productId,
          code: 'review_eligibility_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/private eligibility|relation|email|body|token/i);
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

  test('records public review query failures without exposing raw review details', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const order = vi.fn(() => Promise.resolve({data: null, error: {message: 'relation private.review_notes does not exist'}}));
    const eq = vi.fn(() => ({order}));
    const select = vi.fn(() => ({eq}));
    const client = {from: vi.fn(() => ({select}))};

    await expect(getApprovedProductReviews({productId, client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'reviews_load_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'storefront.reviews.query_failed',
        summary: 'Storefront product reviews query failed',
        facts: expect.objectContaining({
          action: 'public_reviews',
          productId,
          code: 'reviews_load_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/review_notes|relation|private|body|email|token/i);
  });

  test('keeps review eligibility and public query error states when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValue(new Error('operational table unavailable'));
    const eligibilityClient = {
      rpc: vi.fn(() => Promise.resolve({data: null, error: {message: 'eligibility failed'}}))
    };

    await expect(canReviewProduct({productId, client: eligibilityClient as never})).resolves.toEqual({
      status: 'error',
      code: 'review_eligibility_failed'
    });

    const order = vi.fn(() => Promise.resolve({data: null, error: {message: 'reviews failed'}}));
    const eq = vi.fn(() => ({order}));
    const select = vi.fn(() => ({eq}));
    const queryClient = {from: vi.fn(() => ({select}))};

    await expect(getApprovedProductReviews({productId, client: queryClient as never})).resolves.toEqual({
      status: 'error',
      code: 'reviews_load_failed'
    });
  });
});

describe('admin review query operational recording', () => {
  test('records admin review queue failures without exposing customer or review content', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const client = {
      rpc: vi.fn(() => Promise.resolve({data: null, error: {message: 'private admin review relation failed for buyer@example.test'}}))
    };

    await expect(getAdminProductReviews({status: 'pending', client})).resolves.toEqual({
      status: 'error',
      code: 'admin_reviews_load_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_reviews_load_failed',
        summary: 'Admin product reviews query failed',
        facts: expect.objectContaining({
          action: 'admin_reviews',
          status: 'pending',
          code: 'admin_reviews_load_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(
      /buyer@example|private admin|relation|review body|email|token/i
    );
  });

  test('keeps admin review query error states when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValue(new Error('operational table unavailable'));
    const client = {
      rpc: vi.fn(() => Promise.resolve({data: null, error: {message: 'admin reviews failed'}}))
    };

    await expect(getAdminProductReviews({status: 'pending', client})).resolves.toEqual({
      status: 'error',
      code: 'admin_reviews_load_failed'
    });
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

  test('moderation records RPC failures without exposing notes or database details', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const client = {
      rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private moderation rpc detail'}})
    };

    await expect(moderateProductReview({
      reviewId: productId,
      expectedVersion: 2,
      expectedStatus: 'pending',
      targetStatus: 'approved',
      moderationNote: 'Internal customer note'
    }, client, recordOperationalFailure)).resolves.toEqual({status: 'error', code: 'review_admin_action_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'review_admin_action_failed',
        summary: 'Review moderation RPC failed',
        facts: expect.objectContaining({
          action: 'review_moderate',
          referenceId: productId,
          status: 'approved',
          code: 'review_admin_action_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/Internal customer note|private moderation|email|body/i);
  });

  test('keeps moderation error result stable when operational recording fails', async () => {
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const client = {
      rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private moderation rpc detail'}})
    };

    await expect(moderateProductReview({
      reviewId: productId,
      expectedVersion: 2,
      expectedStatus: 'pending',
      targetStatus: 'approved',
      moderationNote: 'Internal customer note'
    }, client, recordOperationalFailure)).resolves.toEqual({status: 'error', code: 'review_admin_action_failed'});
  });

  test('reply upsert records unexpected RPC results without exposing reply body', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const client = {rpc: vi.fn().mockResolvedValue({data: {status: 'saved'}, error: null})};

    await expect(upsertReviewReply({
      reviewId: productId,
      expectedReviewVersion: 3,
      expectedReviewStatus: 'approved',
      body: 'Thanks for the detailed review.'
    }, client, recordOperationalFailure)).resolves.toEqual({status: 'error', code: 'review_admin_action_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'review_admin_action_failed',
        summary: 'Review reply upsert returned an unexpected result',
        facts: expect.objectContaining({
          action: 'review_reply_upsert',
          referenceId: productId,
          status: 'approved',
          code: 'review_admin_action_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/Thanks for the detailed review|body/i);
  });
});

describe('product review submit operational recording', () => {
  test('submit records RPC failures without exposing review text', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const client = {
      rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private submit rpc detail'}})
    };

    await expect(submitProductReview({
      productId,
      input: {rating: 5, title: 'Sweet bear', body: 'I loved making this pattern.'},
      client,
      recordOperationalFailure
    })).resolves.toEqual({status: 'error', code: 'review_submit_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'review_submit_failed',
        summary: 'Product review submit failed',
        facts: expect.objectContaining({
          action: 'review_submit',
          productId,
          code: 'review_submit_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/Sweet bear|loved making|private submit|body/i);
  });

  test('keeps submit error result stable when operational recording fails', async () => {
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const client = {
      rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'private submit rpc detail'}})
    };

    await expect(submitProductReview({
      productId,
      input: {rating: 5, title: 'Sweet bear', body: 'I loved making this pattern.'},
      client,
      recordOperationalFailure
    })).resolves.toEqual({status: 'error', code: 'review_submit_failed'});
  });
});
