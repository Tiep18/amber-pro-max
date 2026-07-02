const productMediaPublicPath = '/storage/v1/object/public/product-media/';

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolvePublicProductImageUrl(
  imageSource: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
) {
  const source = imageSource?.trim();
  if (!source) {
    return null;
  }
  if (source.startsWith('/')) {
    return source;
  }
  if (isHttpUrl(source)) {
    return source;
  }

  const baseUrl = supabaseUrl?.trim().replace(/\/+$/, '');
  if (!baseUrl || !isHttpUrl(baseUrl)) {
    return null;
  }
  return `${baseUrl}${productMediaPublicPath}${source}`;
}
