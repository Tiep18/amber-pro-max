import 'server-only';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache-tags';

export function invalidateCatalogCache() {
  revalidateTag(CACHE_TAGS.catalog, 'max');
}

export function invalidateBlogCache() {
  revalidateTag(CACHE_TAGS.blog, 'max');
}

export function invalidatePolicyCache() {
  revalidateTag(CACHE_TAGS.policies, 'max');
}
