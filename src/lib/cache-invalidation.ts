import 'server-only';

import { revalidateTag, updateTag } from 'next/cache';
import { CACHE_TAGS } from './cache-tags';

export function invalidateCatalogCache() {
  revalidateTag(CACHE_TAGS.catalog, 'max');
}

export function invalidateBlogCache() {
  revalidateTag(CACHE_TAGS.blog, 'max');
}

export function invalidatePolicyCache() {
  updateTag(CACHE_TAGS.policies);
}
