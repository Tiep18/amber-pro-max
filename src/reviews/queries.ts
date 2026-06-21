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
    .select('product_id,rating,title,body,masked_author,verified_purchase,approved_at')
    .eq('product_id', productId)
    .order('approved_at', {ascending: false});

  if (error || !Array.isArray(data)) {
    return {status: 'error', code: 'reviews_load_failed'};
  }
  return {status: 'success', reviews: mapPublicReviewRows(data)};
}
