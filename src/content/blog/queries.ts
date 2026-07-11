import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runMonitoredThrowingQuery } from '@/operations/monitoring';
import type { Json } from '@/types/supabase';
import type { Database } from '@/types/supabase';
import type { BlogPostFormInitial, BlogSelectOption } from '@/components/admin/blog/blog-post-form';
import type { BlogLocale } from './schemas';

type BlogTranslationRow = {
  locale: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
  social_image_bucket: string | null;
  social_image_path: string | null;
};

export type PublicBlogPostListItem = {
  postId: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  categorySlug: string;
  categoryName: string;
  socialImageBucket: string | null;
  socialImagePath: string | null;
};

export type PublicBlogPostDetail = PublicBlogPostListItem & {
  body: string;
  localizedSlugs: { vi?: string; en?: string };
  tags: Array<{ slug: string; name: string }>;
  relatedProducts: Array<{ productId: string; title: string; slug: string; displayOrder: number }>;
};

function normalizeStatus(status: string): BlogPostFormInitial['status'] {
  return status === 'published' || status === 'archived' ? status : 'draft';
}

function cleanSlug(value: string) {
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function localizedSlugs(value: Json): { vi?: string; en?: string } {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, Json | undefined>;
  return {
    vi: typeof record.vi === 'string' ? record.vi : undefined,
    en: typeof record.en === 'string' ? record.en : undefined
  };
}

function publicTags(value: Json): PublicBlogPostDetail['tags'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return [];
    }
    const row = item as Record<string, Json | undefined>;
    return typeof row.slug === 'string' && typeof row.name === 'string'
      ? [{ slug: row.slug, name: row.name }]
      : [];
  });
}

function publicRelatedProducts(value: Json): PublicBlogPostDetail['relatedProducts'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return [];
    }
    const row = item as Record<string, Json | undefined>;
    return typeof row.productId === 'string' &&
      typeof row.title === 'string' &&
      typeof row.slug === 'string' &&
      typeof row.displayOrder === 'number'
      ? [
          {
            productId: row.productId,
            title: row.title,
            slug: row.slug,
            displayOrder: row.displayOrder
          }
        ]
      : [];
  });
}

function publicBlogQueryFailureInput({
  action,
  code,
  summary,
  referenceId
}: {
  action: 'blog_list' | 'blog_detail';
  code: 'blog_list_query_failed' | 'blog_detail_query_failed';
  summary: string;
  referenceId?: string | null;
}) {
  return {
    area: 'application',
    action,
    errorCode: `storefront.blog.${action === 'blog_list' ? 'list' : 'detail'}_query_failed`,
    summary,
    facts: {
      referenceId: referenceId ?? null
    },
    code,
    publicError: () => new Error(code)
  } as const;
}

async function localizedOptions(
  table: 'blog_category_translations' | 'blog_tag_translations' | 'product_translations',
  idColumn: 'category_id' | 'tag_id' | 'product_id'
): Promise<BlogSelectOption[]> {
  const supabase = await createSupabaseServerClient();
  const query =
    table === 'blog_category_translations'
      ? supabase.from(table).select('category_id, name').eq('locale', 'en').order('name')
      : table === 'blog_tag_translations'
        ? supabase.from(table).select('tag_id, name').eq('locale', 'en').order('name')
        : supabase.from(table).select('product_id, title').eq('locale', 'en').order('title');
  const { data, error } = await query;
  if (error) {
    return [];
  }
  return ((data ?? []) as Array<Record<string, string>>).map((row) => ({
    id: String(row[idColumn]),
    label: String(row.name ?? row.title)
  }));
}

export async function getBlogOptions() {
  const [categories, tags, products] = await Promise.all([
    localizedOptions('blog_category_translations', 'category_id'),
    localizedOptions('blog_tag_translations', 'tag_id'),
    localizedOptions('product_translations', 'product_id')
  ]);

  return { categories, tags, products };
}

export async function getAdminBlogPosts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, status, published_at, updated_at, blog_post_translations(locale,title,slug)')
    .order('updated_at', { ascending: false });
  if (error) {
    return [];
  }

  return (data ?? []).map((post) => {
    const translations = post.blog_post_translations as Array<{
      locale: string;
      title: string;
      slug: string;
    }>;
    const vi = translations.find((translation) => translation.locale === 'vi');
    const en = translations.find((translation) => translation.locale === 'en');
    return {
      id: post.id,
      status: post.status,
      publishedAt: post.published_at,
      title: en?.title ?? vi?.title ?? 'Untitled post',
      localized: {
        vi: Boolean(vi?.title?.trim() && vi?.slug?.trim()),
        en: Boolean(en?.title?.trim() && en?.slug?.trim())
      }
    };
  });
}

export async function getBlogPostForForm(postId: string): Promise<BlogPostFormInitial> {
  const supabase = await createSupabaseServerClient();
  const [postResult, translationsResult, tagsResult, relatedProductsResult] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('id, status, category_id, published_at')
      .eq('id', postId)
      .maybeSingle(),
    supabase.from('blog_post_translations').select('*').eq('post_id', postId),
    supabase.from('blog_post_tags').select('tag_id').eq('post_id', postId),
    supabase
      .from('blog_related_products')
      .select('product_id, display_order')
      .eq('post_id', postId)
      .order('display_order')
  ]);

  if (postResult.error || !postResult.data) {
    notFound();
  }

  const translations = new Map(
    ((translationsResult.data ?? []) as BlogTranslationRow[]).map((translation) => [
      translation.locale,
      translation
    ])
  );

  return {
    postId,
    status: normalizeStatus(postResult.data.status),
    categoryId: postResult.data.category_id,
    publishedAt: postResult.data.published_at,
    translations: {
      vi: {
        slug: translations.get('vi')?.slug ?? '',
        title: translations.get('vi')?.title ?? '',
        description: translations.get('vi')?.description ?? '',
        body: translations.get('vi')?.body ?? '',
        seoTitle: translations.get('vi')?.seo_title ?? '',
        seoDescription: translations.get('vi')?.seo_description ?? '',
        socialImageBucket: translations.get('vi')?.social_image_bucket ?? '',
        socialImagePath: translations.get('vi')?.social_image_path ?? ''
      },
      en: {
        slug: translations.get('en')?.slug ?? '',
        title: translations.get('en')?.title ?? '',
        description: translations.get('en')?.description ?? '',
        body: translations.get('en')?.body ?? '',
        seoTitle: translations.get('en')?.seo_title ?? '',
        seoDescription: translations.get('en')?.seo_description ?? '',
        socialImageBucket: translations.get('en')?.social_image_bucket ?? '',
        socialImagePath: translations.get('en')?.social_image_path ?? ''
      }
    },
    tagIds: (tagsResult.data ?? []).map((row) => row.tag_id),
    relatedProducts: (relatedProductsResult.data ?? []).map((row) => ({
      productId: row.product_id,
      displayOrder: row.display_order
    }))
  };
}

export async function listPublishedBlogPosts(
  locale: BlogLocale,
  client?: SupabaseClient<Database>
): Promise<PublicBlogPostListItem[]> {
  const supabase = client ?? (await createSupabaseServerClient());
  return runMonitoredThrowingQuery({
    ...publicBlogQueryFailureInput({
      action: 'blog_list',
      code: 'blog_list_query_failed',
      summary: 'Storefront blog list query failed'
    }),
    query: async () => {
      const { data, error } = await supabase.rpc('list_published_blog_posts', {
        target_locale: locale
      });
      if (error) throw error;
      return (data ?? []).map((post) => ({
        postId: post.post_id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        publishedAt: post.published_at,
        categorySlug: post.category_slug,
        categoryName: post.category_name,
        socialImageBucket: post.social_image_bucket,
        socialImagePath: post.social_image_path
      }));
    }
  });
}

export async function getPublishedBlogPostBySlug(
  {
    locale,
    slug
  }: {
    locale: BlogLocale;
    slug: string;
  },
  client?: SupabaseClient<Database>
): Promise<PublicBlogPostDetail | null> {
  const cleanedSlug = cleanSlug(slug);
  if (!cleanedSlug) {
    return null;
  }

  const supabase = client ?? (await createSupabaseServerClient());
  const post = await runMonitoredThrowingQuery({
    ...publicBlogQueryFailureInput({
      action: 'blog_detail',
      code: 'blog_detail_query_failed',
      summary: 'Storefront blog detail query failed',
      referenceId: cleanedSlug
    }),
    query: async () => {
      const { data, error } = await supabase.rpc('get_published_blog_post_by_slug', {
        target_locale: locale,
        target_slug: cleanedSlug
      });
      if (error) throw error;
      return data?.[0] ?? null;
    }
  });
  if (!post) {
    return null;
  }

  return {
    postId: post.post_id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    body: post.body,
    publishedAt: post.published_at,
    categorySlug: post.category_slug,
    categoryName: post.category_name,
    socialImageBucket: post.social_image_bucket,
    socialImagePath: post.social_image_path,
    localizedSlugs: localizedSlugs(post.localized_slugs),
    tags: publicTags(post.tags),
    relatedProducts: publicRelatedProducts(post.related_products)
  };
}
