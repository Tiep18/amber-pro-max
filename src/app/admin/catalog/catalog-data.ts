import 'server-only';

import {notFound} from 'next/navigation';
import {PRODUCT_MEDIA_BUCKET} from '@/catalog/media-schemas';
import {assertCatalogAdminQueryResults} from '@/catalog/admin-query-results';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {Json} from '@/types/supabase';
import type {CatalogOption, ProductFormInitial} from '@/components/admin/catalog/product-form';

type TranslationRow = {
  locale: string;
  title: string;
  description: string;
  specifications: Json;
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

type AdminProductRow = {
  id: string;
  product_type: string;
  status: string;
  updated_at: string;
  product_translations: Array<{locale: string; title: string}>;
  product_market_offers: Array<{
    market_code: string;
    enabled: boolean;
    price_minor: number | null;
  }>;
  product_media: Array<{
    object_path: string;
    alt_text_en: string | null;
    alt_text_vi: string | null;
    display_order: number;
    is_primary: boolean;
  }>;
};

export type AdminCatalogListFilters = {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
};

export type AdminCatalogProduct = {
  id: string;
  title: string;
  productType: string;
  status: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  markets: {
    vn: boolean;
    intl: boolean;
  };
};

export const ADMIN_CATALOG_PAGE_SIZE = 12;

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
  await assertCatalogAdminQueryResults([{error}], {action: `catalog_options_${table}`});
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

function titleForProduct(product: AdminProductRow) {
  const preferredTitle = product.product_translations
    .find((translation) => translation.locale === 'en')
    ?.title.trim();
  const fallbackTitle = product.product_translations
    .find((translation) => translation.title.trim().length > 0)
    ?.title.trim();

  return preferredTitle || fallbackTitle || 'Untitled product';
}

function thumbnailForProduct(
  product: AdminProductRow,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const image = [...(product.product_media ?? [])].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }
    return left.display_order - right.display_order;
  })[0];

  if (!image?.object_path) {
    return {url: null, alt: titleForProduct(product)};
  }

  return {
    url: supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(image.object_path).data.publicUrl,
    alt: image.alt_text_en || image.alt_text_vi || titleForProduct(product)
  };
}

function normalizePage(page: number | undefined) {
  if (!page || Number.isNaN(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

export async function getAdminProducts(filters: AdminCatalogListFilters = {}) {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('products')
    .select(
      'id, product_type, status, updated_at, product_translations(locale,title), product_market_offers(market_code,enabled,price_minor), product_media(object_path,alt_text_en,alt_text_vi,display_order,is_primary)'
    )
    .order('updated_at', {ascending: false});
  await assertCatalogAdminQueryResults([{error}], {action: 'catalog_admin_list'});

  const products = (data ?? []) as AdminProductRow[];
  const stats = {
    total: products.length,
    published: products.filter((product) => product.status === 'published').length,
    draftOrHidden: products.filter((product) => product.status !== 'published').length
  };

  const search = filters.search?.trim().toLowerCase() ?? '';
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const type = filters.type && filters.type !== 'all' ? filters.type : null;

  const filtered = products.filter((product) => {
    const title = titleForProduct(product).toLowerCase();
    const matchesSearch =
      search.length === 0 ||
      title.includes(search) ||
      product.product_type.toLowerCase().includes(search) ||
      product.status.toLowerCase().includes(search);
    const matchesStatus = !status || product.status === status;
    const matchesType = !type || product.product_type === type;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_CATALOG_PAGE_SIZE));
  const page = Math.min(normalizePage(filters.page), totalPages);
  const start = (page - 1) * ADMIN_CATALOG_PAGE_SIZE;

  return {
    products: filtered.slice(start, start + ADMIN_CATALOG_PAGE_SIZE).map((product) => {
      const thumbnail = thumbnailForProduct(product, supabase);
      const offers = product.product_market_offers ?? [];
      return {
        id: product.id,
        productType: product.product_type,
        status: product.status,
        updatedAt: product.updated_at,
        title: titleForProduct(product),
        thumbnailUrl: thumbnail.url,
        thumbnailAlt: thumbnail.alt,
        markets: {
          vn: Boolean(offers.find((offer) => offer.market_code === 'vn')?.enabled),
          intl: Boolean(offers.find((offer) => offer.market_code === 'intl')?.enabled)
        }
      };
    }),
    total: filtered.length,
    page,
    pageSize: ADMIN_CATALOG_PAGE_SIZE,
    totalPages,
    stats
  };
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

  await assertCatalogAdminQueryResults(
    [
      productResult,
      translationsResult,
      offersResult,
      categoriesResult,
      techniquesResult,
      tagsResult,
      collectionsResult
    ],
    {action: 'catalog_product_editor', productId}
  );

  if (!productResult.data) {
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
