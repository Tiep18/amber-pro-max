'use server';

import {createHash} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/auth/guards';
import {invalidateCatalogCache} from '@/lib/cache-invalidation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import {
  MAX_PATTERN_PDF_BYTES,
  MAX_PRODUCT_IMAGE_BYTES,
  PATTERN_PDF_BUCKET,
  PRODUCT_MEDIA_BUCKET,
  mediaDetailsInputSchema,
  mediaProductIdSchema,
  patternPdfMimeType,
  pdfAssetInputSchema,
  primaryImageInputSchema,
  productImageExtensions,
  productImageMimeTypes,
  removeMediaInputSchema,
  reorderMediaInputSchema,
  socialImageInputSchema
} from './media-schemas';

export type MediaActionCode =
  | 'invalid_input'
  | 'invalid_file'
  | 'product_not_found'
  | 'not_pdf_product'
  | 'media_not_found'
  | 'upload_failed'
  | 'association_failed'
  | 'update_failed'
  | 'remove_failed'
  | 'remove_incomplete'
  | 'reorder_failed';

export type MediaActionResult =
  | {status: 'success'; message: string; warning?: 'cleanup_failed'}
  | {status: 'invalid'; code: MediaActionCode}
  | {status: 'error'; code: MediaActionCode};

function fieldString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function formFile(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function revalidateMedia(productId: string) {
  revalidatePath(`/admin/catalog/${productId}`);
  revalidatePath(`/admin/catalog/${productId}/media`);
  invalidateCatalogCache();
}

async function monitoredMediaFailure(input: {
  action: string;
  errorCode: string;
  summary: string;
  productId?: string;
  referenceId?: string;
  code: MediaActionCode;
  severity?: 'warning' | 'error';
}): Promise<MediaActionResult> {
  return runMonitoredAction({
    area: 'admin',
    severity: input.severity ?? 'error',
    action: input.action,
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: {status: 'error', code: input.code} as const,
    shouldRecordResult: () => true,
    facts: {
      productId: input.productId ?? null,
      referenceId: input.referenceId ?? null
    },
    operation: async () => ({status: 'error', code: input.code}) as const
  });
}

async function productExists(productId: string) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.from('products').select('id, product_type').eq('id', productId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data;
}

async function nextDisplayOrder(productId: string) {
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase
    .from('product_media')
    .select('display_order')
    .eq('product_id', productId)
    .order('display_order', {ascending: false})
    .limit(1)
    .maybeSingle();

  return (data?.display_order ?? -1) + 1;
}

function storageObjectAlreadyMissing(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as {status?: unknown; statusCode?: unknown; code?: unknown};
  if (candidate.status === 404 || candidate.statusCode === 404 || candidate.statusCode === '404') {
    return true;
  }
  if (typeof candidate.code !== 'string') {
    return false;
  }
  return ['404', 'not_found', 'object_not_found', 'no_such_key'].includes(candidate.code.toLowerCase());
}

async function removeStorageObject(
  bucket: typeof PRODUCT_MEDIA_BUCKET | typeof PATTERN_PDF_BUCKET,
  objectPath: string
): Promise<{status: 'removed'} | {status: 'error'}> {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.storage.from(bucket).remove([objectPath]);
    return !result.error || storageObjectAlreadyMissing(result.error) ? {status: 'removed'} : {status: 'error'};
  } catch {
    return {status: 'error'};
  }
}

async function recordStorageRemovalFailure(input: {
  action: string;
  errorCode: string;
  summary: string;
  productId: string;
  referenceId?: string;
  code: MediaActionCode;
  severity?: 'warning' | 'error';
}) {
  await monitoredMediaFailure(input);
}

async function mediaForProduct(productId: string, mediaId: string) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('product_media')
    .select('id, product_id, object_path')
    .eq('id', mediaId)
    .eq('product_id', productId)
    .maybeSingle();

  return error ? null : data;
}

export async function uploadProductImageAction(formData: FormData): Promise<MediaActionResult> {
  await requireAdmin();
  const productId = fieldString(formData, 'productId');
  const parsed = mediaProductIdSchema.safeParse(productId);
  const file = formFile(formData, 'image');
  if (!parsed.success || !file) {
    return {status: 'invalid', code: 'invalid_input'};
  }
  if (
    !productImageMimeTypes.includes(file.type as (typeof productImageMimeTypes)[number]) ||
    file.size > MAX_PRODUCT_IMAGE_BYTES
  ) {
    return {status: 'invalid', code: 'invalid_file'};
  }
  if (!(await productExists(parsed.data))) {
    return {status: 'invalid', code: 'product_not_found'};
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = productImageExtensions[file.type as keyof typeof productImageExtensions];
  const objectPath = `products/${parsed.data}/${crypto.randomUUID()}.${extension}`;
  const displayOrder = await nextDisplayOrder(parsed.data);
  const supabase = await createSupabaseServerClient();
  const upload = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false
  });
  if (upload.error) {
    await monitoredMediaFailure({
      action: 'media_upload',
      errorCode: 'catalog_media_upload_failed',
      summary: 'Catalog media upload failed',
      productId: parsed.data,
      code: 'upload_failed'
    });
    return {status: 'error', code: 'upload_failed'};
  }

  const {error} = await supabase.from('product_media').insert({
    product_id: parsed.data,
    bucket_id: PRODUCT_MEDIA_BUCKET,
    object_path: objectPath,
    alt_text_vi: fieldString(formData, 'altTextVi'),
    alt_text_en: fieldString(formData, 'altTextEn'),
    display_order: displayOrder,
    is_primary: false
  });
  if (error) {
    const cleanup = await removeStorageObject(PRODUCT_MEDIA_BUCKET, objectPath);
    if (cleanup.status === 'error') {
      await recordStorageRemovalFailure({
        action: 'media_upload_rollback_cleanup',
        errorCode: 'catalog_media_rollback_cleanup_failed',
        summary: 'Catalog media rollback cleanup failed',
        productId: parsed.data,
        code: 'remove_failed',
        severity: 'warning'
      });
    }
    await monitoredMediaFailure({
      action: 'media_association',
      errorCode: 'catalog_media_association_failed',
      summary: 'Catalog media association failed',
      productId: parsed.data,
      code: 'association_failed'
    });
    return {status: 'error', code: 'association_failed'};
  }

  revalidateMedia(parsed.data);
  return {status: 'success', message: 'Image uploaded'};
}

export async function updateProductMediaDetailsAction(formData: FormData): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = mediaDetailsInputSchema.safeParse({
    productId: fieldString(formData, 'productId'),
    mediaId: fieldString(formData, 'mediaId'),
    altTextVi: fieldString(formData, 'altTextVi'),
    altTextEn: fieldString(formData, 'altTextEn')
  });
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('product_media')
    .update({
      alt_text_vi: parsed.data.altTextVi,
      alt_text_en: parsed.data.altTextEn
    })
    .eq('id', parsed.data.mediaId)
    .eq('product_id', parsed.data.productId);
  if (error) {
    await monitoredMediaFailure({
      action: 'media_update',
      errorCode: 'catalog_media_update_failed',
      summary: 'Catalog media update failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'update_failed'
    });
    return {status: 'error', code: 'update_failed'};
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Image details saved'};
}

export async function reorderProductMediaAction(
  productId: string,
  mediaIds: string[]
): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = reorderMediaInputSchema.safeParse({productId, mediaIds});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.rpc('admin_reorder_product_media', {
    p_product_id: parsed.data.productId,
    p_media_ids: parsed.data.mediaIds
  });
  if (error) {
    await monitoredMediaFailure({
      action: 'media_reorder',
      errorCode: 'catalog_media_reorder_failed',
      summary: 'Catalog media reorder failed',
      productId: parsed.data.productId,
      code: 'reorder_failed'
    });
    return {status: 'error', code: 'reorder_failed'};
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Image order saved'};
}

export async function setPrimaryProductImageAction(productId: string, mediaId: string): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = primaryImageInputSchema.safeParse({productId, mediaId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }
  if (!(await mediaForProduct(parsed.data.productId, parsed.data.mediaId))) {
    return {status: 'invalid', code: 'media_not_found'};
  }

  const supabase = await createSupabaseServerClient();
  const clearResult = await supabase
    .from('product_media')
    .update({is_primary: false})
    .eq('product_id', parsed.data.productId)
    .eq('is_primary', true);
  if (clearResult.error) {
    await monitoredMediaFailure({
      action: 'media_primary_clear',
      errorCode: 'catalog_media_primary_update_failed',
      summary: 'Catalog media primary update failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'update_failed'
    });
    return {status: 'error', code: 'update_failed'};
  }

  const {error} = await supabase
    .from('product_media')
    .update({is_primary: true})
    .eq('id', parsed.data.mediaId)
    .eq('product_id', parsed.data.productId);
  if (error) {
    await monitoredMediaFailure({
      action: 'media_primary_set',
      errorCode: 'catalog_media_primary_update_failed',
      summary: 'Catalog media primary update failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'update_failed'
    });
    return {status: 'error', code: 'update_failed'};
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Primary image selected'};
}

export async function setProductSocialImageAction(
  productId: string,
  mediaId: string,
  locale: 'vi' | 'en'
): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = socialImageInputSchema.safeParse({productId, mediaId, locale});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }
  const media = await mediaForProduct(parsed.data.productId, parsed.data.mediaId);
  if (!media) {
    return {status: 'invalid', code: 'media_not_found'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('product_translations')
    .update({
      social_image_bucket: PRODUCT_MEDIA_BUCKET,
      social_image_path: media.object_path,
      updated_at: new Date().toISOString()
    })
    .eq('product_id', parsed.data.productId)
    .eq('locale', parsed.data.locale);
  if (error) {
    await monitoredMediaFailure({
      action: 'media_social_set',
      errorCode: 'catalog_media_social_update_failed',
      summary: 'Catalog media social image update failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'update_failed'
    });
    return {status: 'error', code: 'update_failed'};
  }

  revalidateMedia(parsed.data.productId);
  return {
    status: 'success',
    message: parsed.data.locale === 'vi' ? 'Vietnamese social image selected' : 'English social image selected'
  };
}

export async function removeProductMediaAction(productId: string, mediaId: string): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = removeMediaInputSchema.safeParse({productId, mediaId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }
  const media = await mediaForProduct(parsed.data.productId, parsed.data.mediaId);
  if (!media) {
    return {status: 'invalid', code: 'media_not_found'};
  }

  const storageRemoval = await removeStorageObject(PRODUCT_MEDIA_BUCKET, media.object_path);
  if (storageRemoval.status === 'error') {
    await recordStorageRemovalFailure({
      action: 'media_storage_remove',
      errorCode: 'catalog_media_storage_remove_failed',
      summary: 'Catalog media storage remove failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'remove_failed'
    });
    return {status: 'error', code: 'remove_failed'};
  }

  const supabase = await createSupabaseServerClient();
  const clearSocialResult = await supabase
    .from('product_translations')
    .update({social_image_bucket: null, social_image_path: null, updated_at: new Date().toISOString()})
    .eq('product_id', parsed.data.productId)
    .eq('social_image_path', media.object_path);
  if (clearSocialResult.error) {
    await monitoredMediaFailure({
      action: 'media_remove_social_clear',
      errorCode: 'catalog_media_social_clear_failed',
      summary: 'Catalog media social image clear failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'remove_incomplete'
    });
    return {status: 'error', code: 'remove_incomplete'};
  }
  const {error} = await supabase
    .from('product_media')
    .delete()
    .eq('id', parsed.data.mediaId)
    .eq('product_id', parsed.data.productId);
  if (error) {
    await monitoredMediaFailure({
      action: 'media_remove',
      errorCode: 'catalog_media_remove_failed',
      summary: 'Catalog media remove failed',
      productId: parsed.data.productId,
      referenceId: parsed.data.mediaId,
      code: 'remove_incomplete'
    });
    return {status: 'error', code: 'remove_incomplete'};
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Image removed'};
}

export async function uploadPatternPdfAction(formData: FormData): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = pdfAssetInputSchema.safeParse({productId: fieldString(formData, 'productId')});
  const file = formFile(formData, 'pdf');
  if (!parsed.success || !file) {
    return {status: 'invalid', code: 'invalid_input'};
  }
  if (file.type !== patternPdfMimeType || !file.name.toLowerCase().endsWith('.pdf') || file.size > MAX_PATTERN_PDF_BYTES) {
    return {status: 'invalid', code: 'invalid_file'};
  }

  const product = await productExists(parsed.data.productId);
  if (!product) {
    return {status: 'invalid', code: 'product_not_found'};
  }
  if (product.product_type !== 'pdf_pattern') {
    return {status: 'invalid', code: 'not_pdf_product'};
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const objectPath = `patterns/${parsed.data.productId}/${crypto.randomUUID()}.pdf`;
  const supabase = await createSupabaseServerClient();
  const existing = await supabase
    .from('product_digital_assets')
    .select('object_path')
    .eq('product_id', parsed.data.productId)
    .maybeSingle();
  if (existing.error) {
    await monitoredMediaFailure({
      action: 'pattern_pdf_existing_lookup',
      errorCode: 'catalog_pattern_pdf_lookup_failed',
      summary: 'Catalog pattern PDF lookup failed',
      productId: parsed.data.productId,
      code: 'association_failed'
    });
    return {status: 'error', code: 'association_failed'};
  }

  const upload = await supabase.storage.from(PATTERN_PDF_BUCKET).upload(objectPath, bytes, {
    contentType: patternPdfMimeType,
    upsert: false
  });
  if (upload.error) {
    await monitoredMediaFailure({
      action: 'pattern_pdf_upload',
      errorCode: 'catalog_pattern_pdf_upload_failed',
      summary: 'Catalog pattern PDF upload failed',
      productId: parsed.data.productId,
      code: 'upload_failed'
    });
    return {status: 'error', code: 'upload_failed'};
  }

  const {error} = await supabase.from('product_digital_assets').upsert(
    {
      product_id: parsed.data.productId,
      bucket_id: PATTERN_PDF_BUCKET,
      object_path: objectPath,
      file_name: file.name,
      content_type: patternPdfMimeType,
      byte_size: file.size,
      checksum_sha256: checksum,
      is_private: true,
      updated_at: new Date().toISOString()
    },
    {onConflict: 'product_id'}
  );
  if (error) {
    const cleanup = await removeStorageObject(PATTERN_PDF_BUCKET, objectPath);
    if (cleanup.status === 'error') {
      await recordStorageRemovalFailure({
        action: 'pattern_pdf_upload_rollback_cleanup',
        errorCode: 'catalog_pattern_pdf_rollback_cleanup_failed',
        summary: 'Catalog pattern PDF rollback cleanup failed',
        productId: parsed.data.productId,
        code: 'remove_failed',
        severity: 'warning'
      });
    }
    await monitoredMediaFailure({
      action: 'pattern_pdf_association',
      errorCode: 'catalog_pattern_pdf_association_failed',
      summary: 'Catalog pattern PDF association failed',
      productId: parsed.data.productId,
      code: 'association_failed'
    });
    return {status: 'error', code: 'association_failed'};
  }

  if (existing.data?.object_path && existing.data.object_path !== objectPath) {
    const cleanup = await removeStorageObject(PATTERN_PDF_BUCKET, existing.data.object_path);
    if (cleanup.status === 'error') {
      await recordStorageRemovalFailure({
        action: 'pattern_pdf_replacement_cleanup',
        errorCode: 'catalog_pattern_pdf_replacement_cleanup_failed',
        summary: 'Catalog pattern PDF replacement cleanup failed',
        productId: parsed.data.productId,
        code: 'remove_failed',
        severity: 'warning'
      });
      revalidateMedia(parsed.data.productId);
      return {
        status: 'success',
        message: 'Private PDF associated; old file cleanup needs attention.',
        warning: 'cleanup_failed'
      };
    }
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Private PDF associated'};
}

export async function removePatternPdfAction(productId: string): Promise<MediaActionResult> {
  await requireAdmin();
  const parsed = pdfAssetInputSchema.safeParse({productId});
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_input'};
  }

  const supabase = await createSupabaseServerClient();
  const existing = await supabase
    .from('product_digital_assets')
    .select('object_path')
    .eq('product_id', parsed.data.productId)
    .maybeSingle();
  if (!existing.data) {
    return {status: 'invalid', code: 'media_not_found'};
  }

  const storageRemoval = await removeStorageObject(PATTERN_PDF_BUCKET, existing.data.object_path);
  if (storageRemoval.status === 'error') {
    await recordStorageRemovalFailure({
      action: 'pattern_pdf_storage_remove',
      errorCode: 'catalog_pattern_pdf_storage_remove_failed',
      summary: 'Catalog pattern PDF storage remove failed',
      productId: parsed.data.productId,
      code: 'remove_failed'
    });
    return {status: 'error', code: 'remove_failed'};
  }

  const {error} = await supabase.from('product_digital_assets').delete().eq('product_id', parsed.data.productId);
  if (error) {
    await monitoredMediaFailure({
      action: 'pattern_pdf_remove',
      errorCode: 'catalog_pattern_pdf_remove_failed',
      summary: 'Catalog pattern PDF remove failed',
      productId: parsed.data.productId,
      code: 'remove_incomplete'
    });
    return {status: 'error', code: 'remove_incomplete'};
  }

  revalidateMedia(parsed.data.productId);
  return {status: 'success', message: 'Private PDF removed'};
}
