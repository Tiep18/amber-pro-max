import type {Metadata} from 'next';
import type {Locale} from '@/i18n/routing';

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3210';
}

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
  const base = siteUrl();
  const canonical = new URL(canonicalPath, base).toString();
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        vi: new URL(alternatePaths.vi, base).toString(),
        en: new URL(alternatePaths.en, base).toString()
      }
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: socialImage ? [{url: socialImage}] : undefined
    }
  };
}
