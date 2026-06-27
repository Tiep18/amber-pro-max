import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type Locale = 'vi' | 'en';

export type TaxonomyTextField = 'name' | 'slug' | 'description' | 'seoTitle' | 'seoDescription';

export type TaxonomySectionConfig = {
  key: string;
  title: string;
  description: string;
  parentTable: string;
  translationTable: string;
  parentIdColumn: string;
  fields: TaxonomyTextField[];
};

export type TaxonomyTranslation = Partial<Record<TaxonomyTextField, string>>;

export type TaxonomyTerm = {
  id: string;
  updatedAt: string | null;
  usageCount: number;
  translations: Record<Locale, TaxonomyTranslation>;
};

export type TaxonomyReferenceCheck = {
  table: string;
  column: string;
};

type TranslationRow = Record<string, string | null>;

const emptyTranslation: TaxonomyTranslation = {};

export const taxonomyReferenceChecks: Record<string, TaxonomyReferenceCheck[]> = {
  category: [
    { table: 'product_categories', column: 'category_id' },
    { table: 'discount_code_categories', column: 'category_id' }
  ],
  tag: [{ table: 'product_tags', column: 'tag_id' }],
  technique: [{ table: 'product_techniques', column: 'technique_id' }],
  collection: [
    { table: 'collection_products', column: 'collection_id' },
    { table: 'discount_code_collections', column: 'collection_id' }
  ],
  'blog-category': [{ table: 'blog_posts', column: 'category_id' }],
  'blog-tag': [{ table: 'blog_post_tags', column: 'tag_id' }]
};

function rowTranslation(row: TranslationRow, fields: TaxonomyTextField[]): TaxonomyTranslation {
  const translation: TaxonomyTranslation = {};
  for (const field of fields) {
    const column =
      field === 'seoTitle' ? 'seo_title' : field === 'seoDescription' ? 'seo_description' : field;
    translation[field] = row[column] ?? '';
  }
  return translation;
}

async function usageCountForTerm(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  config: TaxonomySectionConfig,
  termId: string
) {
  const checks = taxonomyReferenceChecks[config.key] ?? [];
  const results = await Promise.all(
    checks.map(({ table, column }) =>
      supabase
        .from(table as never)
        .select(column, { count: 'exact', head: true })
        .eq(column, termId)
    )
  );

  return results.reduce((total, { count, error }) => total + (error ? 0 : (count ?? 0)), 0);
}

export async function getTaxonomyTerms(config: TaxonomySectionConfig): Promise<TaxonomyTerm[]> {
  const supabase = await createSupabaseServerClient();
  const { data: parents, error: parentError } = await supabase
    .from(config.parentTable as never)
    .select('id, updated_at')
    .order('updated_at', { ascending: false });

  if (parentError || !parents) {
    return [];
  }

  const parentIds = (parents as Array<{ id: string; updated_at: string | null }>).map(
    (parent) => parent.id
  );
  if (parentIds.length === 0) {
    return [];
  }

  const columns = [
    config.parentIdColumn,
    'locale',
    ...config.fields.map((field) =>
      field === 'seoTitle' ? 'seo_title' : field === 'seoDescription' ? 'seo_description' : field
    )
  ].join(',');

  const { data: translations, error: translationError } = await supabase
    .from(config.translationTable as never)
    .select(columns)
    .in(config.parentIdColumn, parentIds);

  if (translationError) {
    return [];
  }

  const translationsByParent = new Map<string, Map<Locale, TaxonomyTranslation>>();
  for (const row of (translations ?? []) as TranslationRow[]) {
    const parentId = String(row[config.parentIdColumn]);
    const locale = row.locale === 'vi' ? 'vi' : 'en';
    const byLocale = translationsByParent.get(parentId) ?? new Map<Locale, TaxonomyTranslation>();
    byLocale.set(locale, rowTranslation(row, config.fields));
    translationsByParent.set(parentId, byLocale);
  }

  const parentRows = parents as Array<{ id: string; updated_at: string | null }>;
  const usageCounts = new Map<string, number>(
    await Promise.all(
      parentRows.map(
        async (parent) => [parent.id, await usageCountForTerm(supabase, config, parent.id)] as const
      )
    )
  );

  return parentRows.map((parent) => {
    const byLocale = translationsByParent.get(parent.id);
    return {
      id: parent.id,
      updatedAt: parent.updated_at,
      usageCount: usageCounts.get(parent.id) ?? 0,
      translations: {
        vi: byLocale?.get('vi') ?? emptyTranslation,
        en: byLocale?.get('en') ?? emptyTranslation
      }
    };
  });
}

export const catalogTaxonomySections: TaxonomySectionConfig[] = [
  {
    key: 'category',
    title: 'Product categories',
    description: 'Top-level storefront grouping for product discovery and SEO.',
    parentTable: 'categories',
    translationTable: 'category_translations',
    parentIdColumn: 'category_id',
    fields: ['name', 'slug', 'description', 'seoTitle', 'seoDescription']
  },
  {
    key: 'tag',
    title: 'Product tags',
    description: 'Lightweight product labels used for filtering and merchandising.',
    parentTable: 'tags',
    translationTable: 'tag_translations',
    parentIdColumn: 'tag_id',
    fields: ['name']
  },
  {
    key: 'technique',
    title: 'Techniques',
    description: 'Crochet techniques used in product taxonomy and filtering.',
    parentTable: 'techniques',
    translationTable: 'technique_translations',
    parentIdColumn: 'technique_id',
    fields: ['name', 'description']
  },
  {
    key: 'collection',
    title: 'Collections',
    description: 'Curated product groups for storefront storytelling and SEO.',
    parentTable: 'collections',
    translationTable: 'collection_translations',
    parentIdColumn: 'collection_id',
    fields: ['name', 'slug', 'description', 'seoTitle', 'seoDescription']
  }
];

export const blogTaxonomySections: TaxonomySectionConfig[] = [
  {
    key: 'blog-category',
    title: 'Blog categories',
    description: 'Primary grouping for blog posts and localized SEO pages.',
    parentTable: 'blog_categories',
    translationTable: 'blog_category_translations',
    parentIdColumn: 'category_id',
    fields: ['name', 'slug', 'description']
  },
  {
    key: 'blog-tag',
    title: 'Blog tags',
    description: 'Topic labels for blog posts and content discovery.',
    parentTable: 'blog_tags',
    translationTable: 'blog_tag_translations',
    parentIdColumn: 'tag_id',
    fields: ['name', 'slug']
  }
];

export function taxonomyConfigFor(key: string) {
  return [...catalogTaxonomySections, ...blogTaxonomySections].find(
    (section) => section.key === key
  );
}
