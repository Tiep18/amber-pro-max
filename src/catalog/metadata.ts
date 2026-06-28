import type {Metadata} from 'next';
import type {Locale} from '@/i18n/routing';
import {absoluteUrl, localizedAlternates, siteUrl} from '@/content/seo/metadata';

export {siteUrl};

export function publicStorageUrl(bucket: string | null, path: string | null) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !bucket || !path) {
    return undefined;
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function localizedMetadata({
  title,
  description,
  canonicalPath,
  alternatePaths,
  socialImage
}: {
  title: string;
  description: string;
  canonicalPath: string;
  alternatePaths: Record<Locale, string>;
  socialImage?: string;
}): Metadata {
  const canonical = absoluteUrl(canonicalPath);
  const languages = localizedAlternates(alternatePaths);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: socialImage ? [{url: socialImage}] : undefined
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: socialImage ? [socialImage] : undefined
    }
  };
}
