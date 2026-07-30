import { NextResponse } from 'next/server';
import { getRequestMarket } from '@/catalog/page-context';
import { catalogProjectionQuerySchema } from '@/catalog/projection-schemas';
import { getCachedCatalogProjection } from '@/catalog/public-cache';

const privateNoStoreHeaders = { 'Cache-Control': 'private, no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateNoStoreHeaders });
}

function strictSearchParams(searchParams: URLSearchParams) {
  const values: Record<string, string> = {};
  for (const key of new Set(searchParams.keys())) {
    const entries = searchParams.getAll(key);
    if (entries.length !== 1) {
      return null;
    }
    values[key] = entries[0]!;
  }
  return values;
}

export async function GET(request: Request) {
  const rawQuery = strictSearchParams(new URL(request.url).searchParams);
  const parsed = rawQuery ? catalogProjectionQuerySchema.safeParse(rawQuery) : null;
  if (!parsed?.success) {
    return json({ status: 'error', code: 'invalid_catalog_projection' }, 400);
  }

  try {
    const market = await getRequestMarket();
    const query = parsed.data;
    const projection = await getCachedCatalogProjection({
      locale: query.locale,
      market,
      surface: query.surface,
      search: query.search ?? null,
      productType: query.productType ?? null,
      categorySlug: query.categorySlug ?? null,
      collectionSlug: query.collectionSlug ?? null,
      techniqueSlug: query.techniqueSlug ?? null,
      tagSlug: query.tagSlug ?? null,
      sort: query.sort,
      offset: query.offset,
      limit: query.limit
    });
    return json({ status: 'ready', projection });
  } catch {
    return json({ status: 'error', code: 'catalog_projection_unavailable' }, 503);
  }
}
