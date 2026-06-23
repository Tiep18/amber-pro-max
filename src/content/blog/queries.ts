import 'server-only';

import {notFound} from 'next/navigation';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {BlogPostFormInitial, BlogSelectOption} from '@/components/admin/blog/blog-post-form';

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

function normalizeStatus(status: string): BlogPostFormInitial['status'] {
  return status === 'published' || status === 'archived' ? status : 'draft';
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
  const {data, error} = await query;
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

  return {categories, tags, products};
}

export async function getAdminBlogPosts() {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('blog_posts')
    .select('id, status, published_at, updated_at, blog_post_translations(locale,title)')
    .order('updated_at', {ascending: false});
  if (error) {
    return [];
  }

  return (data ?? []).map((post) => {
    const translations = post.blog_post_translations as Array<{locale: string; title: string}>;
    return {
      id: post.id,
      status: post.status,
      publishedAt: post.published_at,
      title: translations.find((translation) => translation.locale === 'en')?.title ?? translations[0]?.title ?? 'Untitled post'
    };
  });
}

export async function getBlogPostForForm(postId: string): Promise<BlogPostFormInitial> {
  const supabase = await createSupabaseServerClient();
  const [postResult, translationsResult, tagsResult, relatedProductsResult] = await Promise.all([
    supabase.from('blog_posts').select('id, status, category_id, published_at').eq('id', postId).maybeSingle(),
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
    ((translationsResult.data ?? []) as BlogTranslationRow[]).map((translation) => [translation.locale, translation])
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
