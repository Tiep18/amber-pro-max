import 'server-only';

import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {publicStorageUrl} from './metadata';

export async function getProductMediaImages({
  productId,
  primaryImagePath,
  primaryImageBucket,
  primaryImageAlt,
  title,
  locale
}: {
  productId: string;
  primaryImagePath: string | null;
  primaryImageBucket: string | null;
  primaryImageAlt: string | null;
  title: string;
  locale: Locale;
}) {
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase
    .from('product_media')
    .select('bucket_id,object_path,alt_text_vi,alt_text_en,display_order,is_primary')
    .eq('product_id', productId)
    .order('display_order', {ascending: true});
  const mapped = (data ?? []).flatMap((image) => {
    const url = publicStorageUrl(image.bucket_id, image.object_path);
    return url
      ? [{
          url,
          alt: (locale === 'vi' ? image.alt_text_vi : image.alt_text_en) || primaryImageAlt || title,
          isPrimary: image.is_primary,
          displayOrder: image.display_order
        }]
      : [];
  });

  if (mapped.length > 0) {
    return mapped.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.displayOrder - b.displayOrder);
  }

  const primaryUrl = publicStorageUrl(primaryImageBucket, primaryImagePath);
  return primaryUrl
    ? [{url: primaryUrl, alt: primaryImageAlt || title, isPrimary: true, displayOrder: 0}]
    : [];
}
