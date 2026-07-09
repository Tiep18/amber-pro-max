import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

export type ReviewInput = {
  rating: number;
  title: string | null;
  body: string | null;
};

export type PublicProductReview = {
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
  maskedAuthor: string;
  verifiedPurchase: boolean;
  approvedAt: string;
  shopReplyBody: string | null;
  shopReplyUpdatedAt: string | null;
};

const productReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().max(2000).optional().nullable()
}).strict();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nullableTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseProductReviewInput(input: unknown):
  | {success: true; data: ReviewInput}
  | {success: false; code: 'invalid_review' | 'client_verified_purchase_not_allowed'} {
  if (isRecord(input) && 'verifiedPurchase' in input) {
    return {success: false, code: 'client_verified_purchase_not_allowed'};
  }
  const parsed = productReviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, code: 'invalid_review'};
  }
  return {
    success: true,
    data: {
      rating: parsed.data.rating,
      title: nullableTrimmed(parsed.data.title),
      body: nullableTrimmed(parsed.data.body)
    }
  };
}

export function maskReviewIdentity(email: string) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(email)) {
    return 'Customer';
  }
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function canReviewProduct({productId, client}: {productId: string; client: RpcClient}) {
  const {data, error} = await client.rpc('can_review_product', {p_product_id: productId});
  if (error) {
    return runMonitoredAction({
      area: 'application',
      action: 'review_eligibility',
      errorCode: 'review_eligibility_failed',
      summary: 'Review eligibility check failed',
      errorResult: {status: 'error', code: 'review_eligibility_failed'} as const,
      shouldRecordResult: () => true,
      facts: {
        productId
      },
      operation: async () => ({status: 'error', code: 'review_eligibility_failed'}) as const
    });
  }
  return data === true ? {status: 'eligible'} as const : {status: 'not_eligible'} as const;
}

export function mapPublicReviewRows(rows: unknown[]): PublicProductReview[] {
  return rows.flatMap((row) => {
    if (
      !isRecord(row) ||
      typeof row.product_id !== 'string' ||
      typeof row.rating !== 'number' ||
      typeof row.masked_author !== 'string' ||
      typeof row.verified_purchase !== 'boolean' ||
      typeof row.approved_at !== 'string'
    ) {
      return [];
    }
    return [{
      productId: row.product_id,
      rating: row.rating,
      title: typeof row.title === 'string' ? row.title : null,
      body: typeof row.body === 'string' ? row.body : null,
      maskedAuthor: row.masked_author,
      verifiedPurchase: row.verified_purchase,
      approvedAt: row.approved_at,
      shopReplyBody: typeof row.shop_reply_body === 'string' ? row.shop_reply_body : null,
      shopReplyUpdatedAt: typeof row.shop_reply_updated_at === 'string' ? row.shop_reply_updated_at : null
    }];
  });
}
