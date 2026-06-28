import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { JsonLd, breadcrumbJsonLd } from '@/content/seo/json-ld';
import { getCachedPublishedPolicy } from '@/policies/public-cache';
import type { Locale } from '@/i18n/routing';

type Params = Promise<{ locale: Locale; policySlug: string }>;

export const dynamic = 'force-static';
export const revalidate = 300;

function policyPath(locale: Locale, slug: string) {
  return locale === 'vi' ? `/vi/chinh-sach/${slug}` : `/en/policies/${slug}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, policySlug } = await params;
  const policy = await getCachedPublishedPolicy(locale, policySlug);
  if (!policy || !policy.localizedSlugs.vi || !policy.localizedSlugs.en) {
    return {};
  }

  return localizedMetadata({
    title: policy.seoTitle || policy.title,
    description: policy.seoDescription || policy.summary,
    canonicalPath: policyPath(locale, policy.slug),
    alternatePaths: {
      vi: policyPath('vi', policy.localizedSlugs.vi),
      en: policyPath('en', policy.localizedSlugs.en)
    },
    socialImage: publicStorageUrl(policy.socialImageBucket, policy.socialImagePath)
  });
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { locale, policySlug } = await params;
  setRequestLocale(locale);
  const policy = await getCachedPublishedPolicy(locale, policySlug);
  if (!policy) {
    notFound();
  }

  const currentPath = policyPath(locale, policy.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
          { name: policy.title, path: currentPath }
        ])}
      />
      <main className="mx-auto grid w-full max-w-[860px] gap-6 px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">
            {policy.policyKind.replaceAll('_', ' ')}
          </p>
          <h1 className="text-[28px] font-semibold leading-tight">{policy.title}</h1>
          <p className="text-[var(--muted-foreground)]">{policy.summary}</p>
        </div>
        <article className="grid gap-4 leading-7">
          {policy.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </main>
    </>
  );
}
