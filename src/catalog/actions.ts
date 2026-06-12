'use server';

import {requireAdmin} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
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

export type ArchiveProductResult =
  | {status: 'archived'; productId: string}
  | {status: 'invalid'; code: 'invalid_product_id'}
  | {status: 'error'; code: 'archive_failed'};

function validationIssues(error: {issues: {path: PropertyKey[]; message: string}[]}): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.message
  }));
}

async function replaceProductRelations(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  draft: ProductDraft
) {
  const relationDeletes = await Promise.all([
    supabase.from('product_categories').delete().eq('product_id', productId),
    supabase.from('product_techniques').delete().eq('product_id', productId),
    supabase.from('product_tags').delete().eq('product_id', productId),
    supabase.from('collection_products').delete().eq('product_id', productId)
  ]);
  if (relationDeletes.some(({error}) => error)) {
    return false;
  }

  const relationWrites = await Promise.all([
    draft.categoryIds.length
      ? supabase
          .from('product_categories')
          .insert(draft.categoryIds.map((categoryId) => ({product_id: productId, category_id: categoryId})))
      : Promise.resolve({error: null}),
    draft.techniqueIds.length
      ? supabase
          .from('product_techniques')
          .insert(draft.techniqueIds.map((techniqueId) => ({product_id: productId, technique_id: techniqueId})))
      : Promise.resolve({error: null}),
    draft.tagIds.length
      ? supabase
          .from('product_tags')
          .insert(draft.tagIds.map((tagId) => ({product_id: productId, tag_id: tagId})))
      : Promise.resolve({error: null}),
    draft.collections.length
      ? supabase.from('collection_products').insert(
          draft.collections.map(({collectionId, displayOrder}) => ({
            product_id: productId,
            collection_id: collectionId,
            display_order: displayOrder
          }))
        )
      : Promise.resolve({error: null})
  ]);

  return relationWrites.every(({error}) => !error);
}

export async function saveProductDraftAction(input: ProductDraftInput): Promise<SaveProductDraftResult> {
  const admin = await requireAdmin();
  const parsed = productDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', issues: validationIssues(parsed.error)};
  }

  const draft = parsed.data;
  const supabase = await createSupabaseServerClient();
  const productResult = draft.productId
    ? await supabase
        .from('products')
        .update({product_type: draft.productType, updated_at: new Date().toISOString()})
        .eq('id', draft.productId)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('products')
        .insert({product_type: draft.productType, created_by: admin.id})
        .select('id')
        .single();

  if (productResult.error || !productResult.data) {
    return {status: 'error', code: 'save_failed'};
  }

  const productId = productResult.data.id;
  const translations = (['vi', 'en'] as const).map((locale) => {
    const translation = draft.translations[locale];
    return {
      product_id: productId,
      locale,
      title: translation.title,
      description: translation.description,
      specifications: translation.specifications as Json,
      slug: translation.slug,
      seo_title: translation.seoTitle || null,
      seo_description: translation.seoDescription || null
    };
  });
  const offers = [
    {
      product_id: productId,
      market_code: 'vn',
      currency_code: 'VND',
      enabled: draft.offers.vn.enabled,
      price_minor: draft.offers.vn.priceMinor
    },
    {
      product_id: productId,
      market_code: 'intl',
      currency_code: 'USD',
      enabled: draft.offers.intl.enabled,
      price_minor: draft.offers.intl.priceMinor
    }
  ];

  const [{error: translationError}, {error: offerError}, relationsSaved] = await Promise.all([
    supabase.from('product_translations').upsert(translations, {onConflict: 'product_id,locale'}),
    supabase.from('product_market_offers').upsert(offers, {onConflict: 'product_id,market_code'}),
    replaceProductRelations(supabase, productId, draft)
  ]);

  if (translationError || offerError || !relationsSaved) {
    return {status: 'error', code: 'save_failed'};
  }

  return {status: 'saved', productId};
}

export async function publishProductAction(productId: string): Promise<PublishProductResult> {
  await requireAdmin();
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('publish_catalog_product', {
    target_product_id: parsed.data
  });
  if (error || !data?.[0]) {
    return {status: 'error', code: 'publish_failed'};
  }

  if (data[0].published) {
    return {status: 'published', productId: parsed.data};
  }

  const issueResult = await supabase.rpc('catalog_publish_issues', {
    target_product_id: parsed.data
  });
  if (issueResult.error || !issueResult.data) {
    return {status: 'error', code: 'publish_failed'};
  }

  return {
    status: 'blocked',
    productId: parsed.data,
    issues: mapPublishIssues(issueResult.data)
  };
}

export async function archiveProductAction(productId: string): Promise<ArchiveProductResult> {
  await requireAdmin();
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase
    .from('products')
    .update({status: 'archived', updated_at: new Date().toISOString()})
    .eq('id', parsed.data);

  if (error) {
    return {status: 'error', code: 'archive_failed'};
  }

  return {status: 'archived', productId: parsed.data};
}
