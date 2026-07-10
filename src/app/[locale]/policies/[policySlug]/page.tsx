import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { localizedMetadata, publicStorageUrl } from '@/catalog/metadata';
import { JsonLd, breadcrumbJsonLd } from '@/content/seo/json-ld';
import { getCachedPublishedPolicy } from '@/policies/public-cache';
import type { Locale } from '@/i18n/routing';
import { FileText, ShieldCheck } from 'lucide-react';

type Params = Promise<{ locale: Locale; policySlug: string }>;

export const dynamic = 'force-static';
export const revalidate = 300;

function policyPath(locale: Locale, slug: string) {
  return locale === 'vi' ? `/vi/chinh-sach/${slug}` : `/en/policies/${slug}`;
}

const copy = {
  en: {
    eyebrow: 'Studio policy',
    summary: 'Summary',
    kind: 'Policy type',
    note: 'Written for clear checkout expectations and customer trust.'
  },
  vi: {
    eyebrow: 'Chinh sach studio',
    summary: 'Tom tat',
    kind: 'Loai chinh sach',
    note: 'Viet de lam ro ky vong mua hang va tao niem tin cho khach.'
  }
} as const;

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
  const t = copy[locale];
  const paragraphs = policy.body.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);
  const policyKind = policy.policyKind.replaceAll('_', ' ');

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === 'vi' ? 'Trang chu' : 'Home', path: `/${locale}` },
          { name: policy.title, path: currentPath }
        ])}
      />
      <main className="container grid gap-10 py-10 sm:py-12">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(260px,0.32fr)] lg:items-end">
          <div className="grid max-w-[860px] gap-3">
            <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
            <h1 className="text-[40px] font-semibold leading-[1.02] sm:text-[56px]">{policy.title}</h1>
          </div>
          <aside className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>{t.kind}</span>
            </div>
            <p className="font-semibold capitalize">{policyKind}</p>
          </aside>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,760px)_minmax(240px,1fr)] lg:items-start">
          <div className="grid gap-7">
            <div className="grid gap-3 rounded-[24px] bg-[var(--surface-muted)] p-5 sm:p-6">
              <p className="text-sm font-semibold">{t.summary}</p>
              <p className="text-base leading-7 text-[var(--muted-foreground)]">{policy.summary}</p>
            </div>
            <article className="grid gap-5 text-[17px] leading-8 text-[var(--foreground)]">
              {paragraphs.map((paragraph, index) => (
                <p key={paragraph} className={index === 0 ? 'text-xl leading-9 text-[var(--muted-foreground)]' : undefined}>
                  {paragraph}
                </p>
              ))}
            </article>
          </div>

          <aside className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 lg:sticky lg:top-24">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.note}</p>
          </aside>
        </section>
      </main>
    </>
  );
}
