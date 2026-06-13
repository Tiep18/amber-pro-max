import 'server-only';

import {notFound} from 'next/navigation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {Json} from '@/types/supabase';
import type {CatalogOption, ProductFormInitial} from '@/components/admin/catalog/product-form';

type TranslationRow = {
  locale: string;
  title: string;
  description: string;
  specifications: Json;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
};

function stringifySpecifications(value: Json) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return '{}';
}

async function localizedOptions(
  table: 'category_translations' | 'technique_translations' | 'tag_translations' | 'collection_translations',
  idColumn: 'category_id' | 'technique_id' | 'tag_id' | 'collection_id'
): Promise<CatalogOption[]> {
  const supabase = await createSupabaseServerClient();
  const query =
    table === 'category_translations'
      ? supabase.from(table).select('category_id, name').eq('locale', 'en').order('name')
      : table === 'technique_translations'
        ? supabase.from(table).select('technique_id, name').eq('locale', 'en').order('name')
        : table === 'tag_translations'
          ? supabase.from(table).select('tag_id, name').eq('locale', 'en').order('name')
          : supabase.from(table).select('collection_id, name').eq('locale', 'en').order('name');
  const {data, error} = await query;
  if (error) {
    return [];
  }
  return ((data ?? []) as Array<Record<string, string>>).map((row) => ({
    id: String(row[idColumn]),
    label: String(row.name)
  }));
}

export async function getCatalogOptions() {
  const [categories, techniques, tags, collections] = await Promise.all([
    localizedOptions('category_translations', 'category_id'),
    localizedOptions('technique_translations', 'technique_id'),
    localizedOptions('tag_translations', 'tag_id'),
    localizedOptions('collection_translations', 'collection_id')
  ]);

  return {categories, techniques, tags, collections};
}

export async function getAdminProducts() {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('products')
    .select('id, product_type, status, updated_at, product_translations(locale,title)')
    .order('updated_at', {ascending: false});
  if (error) {
    return [];
  }
  return (data ?? []).map((product) => {
    const translations = product.product_translations as Array<{locale: string; title: string}>;
    return {
      id: product.id,
      productType: product.product_type,
      status: product.status,
      title: translations.find((translation) => translation.locale === 'en')?.title ?? translations[0]?.title ?? 'Untitled product'
    };
  });
}

export async function getProductForForm(productId: string): Promise<ProductFormInitial> {
  const supabase = await createSupabaseServerClient();
  const [
    productResult,
    translationsResult,
    offersResult,
    categoriesResult,
    techniquesResult,
    tagsResult,
    collectionsResult
  ] = await Promise.all([
    supabase.from('products').select('id, product_type, status').eq('id', productId).maybeSingle(),
    supabase.from('product_translations').select('*').eq('product_id', productId),
    supabase.from('product_market_offers').select('*').eq('product_id', productId),
    supabase.from('product_categories').select('category_id').eq('product_id', productId),
    supabase.from('product_techniques').select('technique_id').eq('product_id', productId),
    supabase.from('product_tags').select('tag_id').eq('product_id', productId),
    supabase.from('collection_products').select('collection_id, display_order').eq('product_id', productId)
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  const translations = new Map(
    ((translationsResult.data ?? []) as TranslationRow[]).map((translation) => [translation.locale, translation])
  );
  const offers = new Map((offersResult.data ?? []).map((offer) => [offer.market_code, offer]));

  return {
    productId,
    productType: productResult.data.product_type === 'physical_finished' ? 'physical_finished' : 'pdf_pattern',
    status: productResult.data.status,
    translations: {
      vi: {
        title: translations.get('vi')?.title ?? '',
        description: translations.get('vi')?.description ?? '',
        specifications: stringifySpecifications(translations.get('vi')?.specifications ?? {}),
        slug: translations.get('vi')?.slug ?? '',
        seoTitle: translations.get('vi')?.seo_title ?? '',
        seoDescription: translations.get('vi')?.seo_description ?? ''
      },
      en: {
        title: translations.get('en')?.title ?? '',
        description: translations.get('en')?.description ?? '',
        specifications: stringifySpecifications(translations.get('en')?.specifications ?? {}),
        slug: translations.get('en')?.slug ?? '',
        seoTitle: translations.get('en')?.seo_title ?? '',
        seoDescription: translations.get('en')?.seo_description ?? ''
      }
    },
    categoryIds: (categoriesResult.data ?? []).map((row) => row.category_id),
    techniqueIds: (techniquesResult.data ?? []).map((row) => row.technique_id),
    tagIds: (tagsResult.data ?? []).map((row) => row.tag_id),
    collections: (collectionsResult.data ?? []).map((row) => ({
      collectionId: row.collection_id,
      displayOrder: row.display_order
    })),
    offers: {
      vn: {
        enabled: offers.get('vn')?.enabled ?? false,
        priceMinor: offers.get('vn')?.price_minor ?? null
      },
      intl: {
        enabled: offers.get('intl')?.enabled ?? false,
        priceMinor: offers.get('intl')?.price_minor ?? null
      }
    }
  };
}
