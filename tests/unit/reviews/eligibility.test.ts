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
