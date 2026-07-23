import { NextResponse } from 'next/server';
import { getRequestMarket } from '@/catalog/page-context';
import { productProjectionParamsSchema } from '@/catalog/projection-schemas';
import { getCachedProductCommerce } from '@/catalog/public-cache';

const privateNoStoreHeaders = { 'Cache-Control': 'private, no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateNoStoreHeaders });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productSlug: string }> }
) {
  const routeParams = await params;
  const searchParams = new URL(request.url).searchParams;
  const parsed = productProjectionParamsSchema.safeParse({
    productSlug: routeParams.productSlug,
    locale: searchParams.get('locale')
  });
  if (
    !parsed.success ||
    searchParams.getAll('locale').length !== 1 ||
    [...searchParams.keys()].some((key) => key !== 'locale')
  ) {
    return json({ status: 'error', code: 'invalid_product_projection' }, 400);
  }

  try {
    const market = await getRequestMarket();
    const projection = await getCachedProductCommerce(
      parsed.data.locale,
      market,
      parsed.data.productSlug
    );
    if (!projection) {
      return json({ status: 'error', code: 'product_not_found' }, 404);
    }
    return json({ status: 'ready', projection });
  } catch {
    return json({ status: 'error', code: 'product_projection_unavailable' }, 503);
  }
}
