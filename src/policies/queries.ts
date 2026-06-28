import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {Json} from '@/types/supabase';
import type {Database} from '@/types/supabase';
import type {PolicyKind, PolicyLocale} from './schemas';

export type PolicyFormInitial = {
  policyId: string;
  policyKind: PolicyKind;
  status: 'draft' | 'published' | 'archived';
  translations: Record<
    PolicyLocale,
    {
      slug: string;
      title: string;
      summary: string;
      body: string;
      seoTitle: string;
      seoDescription: string;
      socialImageBucket: string;
      socialImagePath: string;
    }
  >;
};

export type PublishedPolicyPage = {
  policyId: string;
  policyKind: PolicyKind;
  locale: PolicyLocale;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImageBucket: string | null;
  socialImagePath: string | null;
  publishedAt: string | null;
  localizedSlugs: {vi?: string; en?: string};
};

type TranslationRow = {
  policy_id: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
  social_image_bucket: string | null;
  social_image_path: string | null;
};

const policyKinds: PolicyKind[] = ['privacy', 'terms_of_sale', 'returns', 'digital_downloads'];

function asPolicyKind(value: string): PolicyKind {
  return policyKinds.includes(value as PolicyKind) ? (value as PolicyKind) : 'privacy';
}

function asStatus(value: string): PolicyFormInitial['status'] {
  return value === 'published' || value === 'archived' ? value : 'draft';
}

function stringRecord(value: Json): {vi?: string; en?: string} {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, Json | undefined>;
  return {
    vi: typeof record.vi === 'string' ? record.vi : undefined,
    en: typeof record.en === 'string' ? record.en : undefined
  };
}

function emptyTranslation() {
  return {
    slug: '',
    title: '',
    summary: '',
    body: '',
    seoTitle: '',
    seoDescription: '',
    socialImageBucket: '',
    socialImagePath: ''
  };
}

export async function getAdminPolicyForms(): Promise<PolicyFormInitial[]> {
  const supabase = await createSupabaseServerClient();
  const [policiesResult, translationsResult] = await Promise.all([
    supabase.from('policy_pages').select('id, policy_kind, status').order('policy_kind'),
    supabase.from('policy_page_translations').select('*')
  ]);

  if (policiesResult.error) {
    return [];
  }

  const translationsByPolicy = new Map<string, Map<string, TranslationRow>>();
  for (const translation of (translationsResult.data ?? []) as TranslationRow[]) {
    const current = translationsByPolicy.get(translation.policy_id) ?? new Map<string, TranslationRow>();
    current.set(translation.locale, translation);
    translationsByPolicy.set(translation.policy_id, current);
  }

  return (policiesResult.data ?? []).map((policy) => {
    const translations = translationsByPolicy.get(policy.id);
    const vi = translations?.get('vi');
    const en = translations?.get('en');
    return {
      policyId: policy.id,
      policyKind: asPolicyKind(policy.policy_kind),
      status: asStatus(policy.status),
      translations: {
        vi: vi
          ? {
              slug: vi.slug,
              title: vi.title,
              summary: vi.summary,
              body: vi.body,
              seoTitle: vi.seo_title ?? '',
              seoDescription: vi.seo_description ?? '',
              socialImageBucket: vi.social_image_bucket ?? '',
              socialImagePath: vi.social_image_path ?? ''
            }
          : emptyTranslation(),
        en: en
          ? {
              slug: en.slug,
              title: en.title,
              summary: en.summary,
              body: en.body,
              seoTitle: en.seo_title ?? '',
              seoDescription: en.seo_description ?? '',
              socialImageBucket: en.social_image_bucket ?? '',
              socialImagePath: en.social_image_path ?? ''
            }
          : emptyTranslation()
      }
    };
  });
}

export async function getPublishedPolicyPageBySlug({
  locale,
  slug
}: {
  locale: PolicyLocale;
  slug: string;
}, client?: SupabaseClient<Database>): Promise<PublishedPolicyPage | null> {
  const supabase = client ?? await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('get_published_policy_page_by_slug', {
    target_locale: locale,
    target_slug: slug
  });
  if (error || !data?.[0]) {
    return null;
  }

  const row = data[0];
  return {
    policyId: row.policy_id,
    policyKind: asPolicyKind(row.policy_kind),
    locale: row.locale === 'vi' ? 'vi' : 'en',
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    socialImageBucket: row.social_image_bucket,
    socialImagePath: row.social_image_path,
    publishedAt: row.published_at,
    localizedSlugs: stringRecord(row.localized_slugs)
  };
}
