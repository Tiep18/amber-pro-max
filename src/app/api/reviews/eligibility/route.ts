import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {canReviewProduct} from '@/reviews/eligibility';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const productIdSchema = z.string().uuid();
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie'
};

export async function GET(request: NextRequest) {
  const parsed = productIdSchema.safeParse(request.nextUrl.searchParams.get('productId'));
  if (!parsed.success) {
    return NextResponse.json({status: 'invalid'}, {status: 400, headers: privateHeaders});
  }

  const client = await createSupabaseServerClient();
  const {
    data: {user}
  } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({status: 'not_eligible'}, {headers: privateHeaders});
  }

  const result = await canReviewProduct({productId: parsed.data, client: client as never});
  return NextResponse.json(
    {status: result.status === 'eligible' ? 'eligible' : result.status},
    {status: result.status === 'error' ? 503 : 200, headers: privateHeaders}
  );
}
