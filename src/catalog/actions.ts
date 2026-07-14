'use server';

import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAdmin} from '@/auth/guards';
import {invalidateCatalogCache} from '@/lib/cache-invalidation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import type {Json} from '@/types/supabase';
import {mapPublishIssues, type PublishBlocker} from './publish-checks';
import {
  productDraftSchema,
  productIdSchema,
  type ProductDraft,
  type ProductDraftInput
} from './schemas';

type ValidationIssue = {
  path: string;
  code: string;
};

export type SaveProductDraftResult =
  | {status: 'saved'; productId: string}
  | {status: 'invalid'; issues: ValidationIssue[]}
  | {status: 'error'; code: 'save_failed'};

export type PublishProductResult =
  | {status: 'published'; productId: string}
  | {status: 'blocked'; productId: string; issues: PublishBlocker[]}
  | {status: 'invalid'; code: 'invalid_product_id'}
  | {status: 'error'; code: 'publish_failed'};

export type SaveAndPublishProductResult = SaveProductDraftResult | PublishProductResult;

export type ArchiveProductResult =
  | {status: 'archived'; productId: string}
  | {status: 'invalid'; code: 'invalid_product_id'}
  | {status: 'error'; code: 'archive_failed'};

const productShippingProfileSchema = z.object({
  productId: productIdSchema,
  shippingProfileId: z.union([z.uuid(), z.literal('store_default')])
}).strict();

export type ProductShippingProfileResult =
  | {status: 'saved'}
  | {status: 'invalid'; code: 'invalid_shipping_assignment' | 'inactive_shipping_profile'}
  | {status: 'error'; code: 'shipping_assignment_failed'};

function validationIssues(error: {issues: {path: PropertyKey[]; message: string}[]}): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.message
  }));
}

type CatalogSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function productSavePayload(draft: ProductDraft): Json {
  return {
    product_id: draft.productId ?? null,
    product_type: draft.productType,
    translations: (['vi', 'en'] as const).map((locale) => {
      const translation = draft.translations[locale];
      return {
        locale,
        title: translation.title,
        description: translation.description,
        specifications: translation.specifications,
        slug: translation.slug || null,
        seo_title: translation.seoTitle || null,
        seo_description: translation.seoDescription || null
      };
    }),
    offers: [
      {
        market_code: 'vn',
        currency_code: 'VND',
        enabled: draft.offers.vn.enabled,
        price_minor: draft.offers.vn.priceMinor
      },
      {
        market_code: 'intl',
        currency_code: 'USD',
        enabled: draft.offers.intl.enabled,
        price_minor: draft.offers.intl.priceMinor
      }
    ],
    category_ids: draft.categoryIds,
    technique_ids: draft.techniqueIds,
    tag_ids: draft.tagIds,
    collections: draft.collections.map(({collectionId, displayOrder}) => ({
      collection_id: collectionId,
      display_order: displayOrder
    }))
  } as Json;
}

async function saveProductDraftWithClient(
  draft: ProductDraft,
  supabase: CatalogSupabaseClient
): Promise<SaveProductDraftResult> {
  return runMonitoredAction({
    area: 'admin',
    action: 'catalog_save_product',
    errorCode: 'catalog_save_failed',
    summary: 'Catalog product save failed',
    facts: {
      ...(draft.productId ? {productId: draft.productId} : {}),
      productType: draft.productType,
      status: 'draft'
    },
    errorResult: {status: 'error', code: 'save_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const {data, error} = await supabase.rpc('admin_save_catalog_product', {
        p_payload: productSavePayload(draft)
      });

      if (error || !data) {
        return {status: 'error', code: 'save_failed'} as const;
      }
      return {status: 'saved', productId: data} as const;
    }
  });
}

async function publishProductWithClient(
  productId: string,
  supabase: CatalogSupabaseClient
): Promise<PublishProductResult> {
  const publishResult = await runMonitoredAction({
    area: 'admin',
    action: 'catalog_publish',
    errorCode: 'catalog_publish_failed',
    summary: 'Catalog product publish failed',
    facts: {productId},
    errorResult: {status: 'error', code: 'publish_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const {data, error} = await supabase.rpc('publish_catalog_product', {
        target_product_id: productId
      });
      if (error || !data?.[0]) {
        return {status: 'error', code: 'publish_failed'} as const;
      }
      return {status: data[0].published ? 'published' : 'blocked_check'} as const;
    }
  });

  if (publishResult.status === 'error') {
    return publishResult;
  }

  if (publishResult.status === 'published') {
    return {status: 'published', productId};
  }

  return runMonitoredAction({
    area: 'admin',
    action: 'catalog_publish_issues',
    errorCode: 'catalog_publish_failed',
    summary: 'Catalog product publish issue lookup failed',
    facts: {productId},
    errorResult: {status: 'error', code: 'publish_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const issues = await supabase.rpc('catalog_publish_issues', {
        target_product_id: productId
      });
      if (issues.error || !issues.data) {
        return {status: 'error', code: 'publish_failed'} as const;
      }
      return {
        status: 'blocked',
        productId,
        issues: mapPublishIssues(issues.data)
      } as const;
    }
  });
}

export async function saveProductDraftAction(input: ProductDraftInput): Promise<SaveProductDraftResult> {
  await requireAdmin();
  const parsed = productDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', issues: validationIssues(parsed.error)};
  }

  const supabase = await createSupabaseServerClient();
  const saveResult = await saveProductDraftWithClient(parsed.data, supabase);

  if (saveResult.status === 'error') {
    return saveResult;
  }

  invalidateCatalogCache();
  return saveResult;
}

export async function publishProductAction(productId: string): Promise<PublishProductResult> {
  await requireAdmin();
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  const publishResult = await publishProductWithClient(
    parsed.data,
    await createSupabaseServerClient()
  );
  if (publishResult.status === 'published') {
    invalidateCatalogCache();
  }
  return publishResult;
}

export async function saveAndPublishProductAction(
  input: ProductDraftInput
): Promise<SaveAndPublishProductResult> {
  await requireAdmin();
  const parsed = productDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', issues: validationIssues(parsed.error)};
  }

  const productId = productIdSchema.safeParse(parsed.data.productId);
  if (!productId.success) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  const supabase = await createSupabaseServerClient();
  const saveResult = await saveProductDraftWithClient(parsed.data, supabase);
  if (saveResult.status !== 'saved') {
    return saveResult;
  }

  const publishResult = await publishProductWithClient(saveResult.productId, supabase);
  invalidateCatalogCache();
  return publishResult;
}

export async function archiveProductAction(productId: string): Promise<ArchiveProductResult> {
  await requireAdmin();
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  const archiveResult = await runMonitoredAction({
    area: 'admin',
    action: 'catalog_archive',
    errorCode: 'catalog_archive_failed',
    summary: 'Catalog product archive failed',
    facts: {
      productId: parsed.data
    },
    errorResult: {status: 'error', code: 'archive_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      const {error} = await supabase
        .from('products')
        .update({status: 'archived', updated_at: new Date().toISOString()})
        .eq('id', parsed.data);

      if (error) {
        return {status: 'error', code: 'archive_failed'} as const;
      }
      return {status: 'archived', productId: parsed.data} as const;
    }
  });

  if (archiveResult.status === 'error') {
    return archiveResult;
  }

  invalidateCatalogCache();
  return archiveResult;
}

export async function saveProductShippingProfileAction(input: unknown): Promise<ProductShippingProfileResult> {
  await requireAdmin();
  const parsed = productShippingProfileSchema.safeParse(input);
  if (!parsed.success) return {status: 'invalid', code: 'invalid_shipping_assignment'};

  return runMonitoredAction({
    area: 'admin',
    action: 'catalog_product_shipping_profile_save',
    errorCode: 'catalog_product_shipping_profile_failed',
    summary: 'Catalog product shipping profile save failed',
    facts: {productId: parsed.data.productId},
    errorResult: {status: 'error', code: 'shipping_assignment_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const supabase = await createSupabaseServerClient();
      if (parsed.data.shippingProfileId === 'store_default') {
        const {error} = await supabase
          .from('product_shipping_profiles')
          .delete()
          .eq('product_id', parsed.data.productId);
        return error
          ? {status: 'error', code: 'shipping_assignment_failed'} as const
          : {status: 'saved'} as const;
      }

      const {data: profile, error: profileError} = await supabase
        .from('shipping_profiles')
        .select('id')
        .eq('id', parsed.data.shippingProfileId)
        .eq('active', true)
        .maybeSingle();
      if (profileError || !profile) return {status: 'invalid', code: 'inactive_shipping_profile'} as const;

      const {error} = await supabase.from('product_shipping_profiles').upsert(
        {product_id: parsed.data.productId, profile_id: profile.id},
        {onConflict: 'product_id'}
      );
      return error ? {status: 'error', code: 'shipping_assignment_failed'} as const : {status: 'saved'} as const;
    }
  }).then((result) => {
    if (result.status === 'saved') {
      revalidatePath(`/admin/catalog/${parsed.data.productId}`);
      revalidatePath('/admin/shipping');
      invalidateCatalogCache();
    }
    return result;
  });
}
