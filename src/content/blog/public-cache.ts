import 'server-only';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { getPublishedBlogPostBySlug, listPublishedBlogPosts } from './queries';
import type { BlogLocale } from './schemas';

async function publishedBlogPosts(locale: BlogLocale) {
  return listPublishedBlogPosts(locale, createSupabasePublicClient());
}

async function publishedBlogPost(locale: BlogLocale, slug: string) {
  return getPublishedBlogPostBySlug({ locale, slug }, createSupabasePublicClient());
}

export const getCachedPublishedBlogPosts = unstable_cache(publishedBlogPosts, ['blog-posts'], {
  revalidate: 300,
  tags: [CACHE_TAGS.blog]
});
export const getCachedPublishedBlogPost = unstable_cache(publishedBlogPost, ['blog-post'], {
  revalidate: 300,
  tags: [CACHE_TAGS.blog]
});
