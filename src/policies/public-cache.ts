import 'server-only';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { getPublishedPolicyPageBySlug } from './queries';
import type { PolicyLocale } from './schemas';

async function publishedPolicy(locale: PolicyLocale, slug: string) {
  return getPublishedPolicyPageBySlug({ locale, slug }, createSupabasePublicClient());
}

export const getCachedPublishedPolicy = unstable_cache(publishedPolicy, ['published-policy'], {
  revalidate: 300,
  tags: [CACHE_TAGS.policies]
});
