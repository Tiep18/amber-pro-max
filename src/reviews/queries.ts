import {createSupabaseServerClient} from '@/lib/supabase/server';
import {mapPublicReviewRows, type PublicProductReview} from '@/reviews/eligibility';

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export type AdminProductReview = {
  reviewId: string;
  productId: string;
  productTitle: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  version: number;
  submittedAt: string;
  updatedAt: string;
  replyBody: string | null;
  replyVersion: number | null;
  replyUpdatedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'hidden';
}

function mapAdminRows(rows: unknown[]): AdminProductReview[] {
  return rows.flatMap((row) => {
    if (
      !isRecord(row) ||
      typeof row.review_id !== 'string' ||
      typeof row.product_id !== 'string' ||
      typeof row.product_title !== 'string' ||
      typeof row.customer_email !== 'string' ||
      typeof row.rating !== 'number' ||
      !isReviewStatus(row.review_status) ||
      typeof row.review_version !== 'number' ||
      typeof row.submitted_at !== 'string' ||
      typeof row.updated_at !== 'string'
    ) {
      return [];
    }
    return [{
      reviewId: row.review_id,
      productId: row.product_id,
      productTitle: row.product_title,
      customerEmail: row.customer_email,
      rating: row.rating,
      title: typeof row.review_title === 'string' ? row.review_title : null,
      body: typeof row.review_body === 'string' ? row.review_body : null,
      status: row.review_status,
      version: row.review_version,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      replyBody: typeof row.reply_body === 'string' ? row.reply_body : null,
      replyVersion: typeof row.reply_version === 'number' ? row.reply_version : null,
      replyUpdatedAt: typeof row.reply_updated_at === 'string' ? row.reply_updated_at : null
    }];
  });
}

export async function getApprovedProductReviews({
  productId,
  client
}: {
  productId: string;
  client?: QueryClient;
}): Promise<{status: 'success'; reviews: PublicProductReview[]} | {status: 'error'; code: 'reviews_load_failed'}> {
  const supabase = client ?? (await createSupabaseServerClient() as unknown as QueryClient);
  const {data, error} = await supabase
    .from('approved_product_reviews')
    .select('product_id,rating,title,body,masked_author,verified_purchase,approved_at,shop_reply_body,shop_reply_updated_at')
    .eq('product_id', productId)
    .order('approved_at', {ascending: false});

  if (error || !Array.isArray(data)) {
    return {status: 'error', code: 'reviews_load_failed'};
  }
  return {status: 'success', reviews: mapPublicReviewRows(data)};
}

export async function getAdminProductReviews({
  status,
  client
}: {
  status?: ReviewStatus;
  client?: RpcClient;
}): Promise<{status: 'success'; reviews: AdminProductReview[]} | {status: 'error'; code: 'admin_reviews_load_failed'}> {
  const supabase = client ?? (await createSupabaseServerClient() as unknown as RpcClient);
  const {data, error} = await supabase.rpc('get_admin_product_reviews', {p_status: status ?? null});
  if (error || !Array.isArray(data)) {
    return {status: 'error', code: 'admin_reviews_load_failed'};
  }
  return {status: 'success', reviews: mapAdminRows(data)};
}
