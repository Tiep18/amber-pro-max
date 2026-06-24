'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {publishPolicyAction, savePolicyDraftAction, unpublishPolicyAction} from '@/policies/actions';
import type {PolicyPublishBlocker} from '@/policies/publish-checks';
import type {PolicyKind, PolicyLocale, PolicyDraftInput} from '@/policies/schemas';
import type {PolicyFormInitial} from '@/policies/queries';

type PolicyFormProps = {
  policyKind: PolicyKind;
  initialPolicy?: PolicyFormInitial;
};

type TranslationState = PolicyFormInitial['translations']['en'];

const emptyTranslation: TranslationState = {
  slug: '',
  title: '',
  summary: '',
  body: '',
  seoTitle: '',
  seoDescription: '',
  socialImageBucket: '',
  socialImagePath: ''
};

const inputClass =
  'min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base';

const kindLabels: Record<PolicyKind, string> = {
  privacy: 'Privacy policy',
  terms_of_sale: 'Terms of sale',
  returns: 'Physical return policy',
  digital_downloads: 'Digital download policy'
};

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function blockerLabel(issue: PolicyPublishBlocker) {
  const locale = issue.locale === 'vi' ? 'Vietnamese ' : issue.locale === 'en' ? 'English ' : '';
  const labels: Record<PolicyPublishBlocker['code'], string> = {
    missing_translation: `${locale}translation`,
    missing_slug: `${locale}slug`,
    missing_title: `${locale}title`,
    missing_summary: `${locale}summary`,
    missing_body: `${locale}body`,
    missing_seo_title: `${locale}SEO title`,
    missing_seo_description: `${locale}SEO description`,
    missing_social_image: `${locale}social image`,
    publish_requirement: 'Publish requirement'
  };
  return labels[issue.code];
}

export function PolicyForm({policyKind, initialPolicy}: PolicyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [policyId, setPolicyId] = useState(initialPolicy?.policyId);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<PolicyPublishBlocker[]>([]);
  const [translations, setTranslations] = useState<Record<PolicyLocale, TranslationState>>(
    initialPolicy?.translations ?? {vi: {...emptyTranslation}, en: {...emptyTranslation}}
  );

  function updateTranslation(locale: PolicyLocale, key: keyof TranslationState, value: string) {
    setTranslations((current) => ({
      ...current,
      [locale]: {...current[locale], [key]: value}
    }));
  }

  function payload(): PolicyDraftInput {
    return {
      ...(policyId ? {policyId} : {}),
      policyKind,
      translations: {
        vi: {
          ...translations.vi,
          socialImageBucket: optional(translations.vi.socialImageBucket),
          socialImagePath: optional(translations.vi.socialImagePath)
        },
        en: {
          ...translations.en,
          socialImageBucket: optional(translations.en.socialImageBucket),
          socialImagePath: optional(translations.en.socialImagePath)
        }
      }
    };
  }

  function saveDraft() {
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await savePolicyDraftAction(payload());
      if (result.status === 'saved') {
        setPolicyId(result.policyId);
        setNotice('Policy saved');
        router.refresh();
        return;
      }
      setError(result.status === 'invalid' ? 'Review the required policy fields.' : 'This content could not be saved. Review the highlighted fields and try again.');
    });
  }

  function publish() {
    if (!policyId) {
      setError('Save the policy before publishing.');
      return;
    }
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await publishPolicyAction(policyId);
      if (result.status === 'published') {
        setNotice('Policy published');
        router.refresh();
        return;
      }
      if (result.status === 'blocked') {
        setBlockers(result.issues);
        return;
      }
      setError('This content could not be published.');
    });
  }

  function unpublish() {
    if (!policyId) {
      return;
    }
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await unpublishPolicyAction(policyId);
      if (result.status === 'unpublished') {
        setNotice('Policy unpublished');
        router.refresh();
        return;
      }
      setError('This content could not be unpublished.');
    });
  }

  return (
    <Card aria-label={kindLabels[policyKind]}>
      <CardHeader>
        <CardTitle>{kindLabels[policyKind]}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{initialPolicy?.status ?? 'draft'}</p>
      </CardHeader>
      <CardContent>
        {notice ? <Alert variant="success">{notice}</Alert> : null}
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {blockers.length ? (
          <Alert variant="warning">
            <AlertTitle>Publishing blocked</AlertTitle>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((issue, index) => (
                <li key={`${issue.code}-${issue.locale ?? 'shared'}-${index}`}>{blockerLabel(issue)}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {(['vi', 'en'] as const).map((locale) => (
          <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
            <legend className="px-1 font-semibold">{locale === 'vi' ? 'Vietnamese policy content' : 'English policy content'}</legend>
            {(['title', 'slug', 'summary', 'seoTitle', 'seoDescription', 'socialImageBucket', 'socialImagePath'] as const).map((field) => (
              <label key={field} className="grid gap-2 font-semibold">
                {locale === 'vi' ? 'Vietnamese' : 'English'} {field}
                <input
                  value={translations[locale][field]}
                  onChange={(event) => updateTranslation(locale, field, event.target.value)}
                  className={inputClass}
                />
              </label>
            ))}
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese body' : 'English body'}
              <textarea
                value={translations[locale].body}
                onChange={(event) => updateTranslation(locale, 'body', event.target.value)}
                className={inputClass}
                rows={8}
              />
            </label>
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-3">
          <Button onClick={saveDraft} disabled={isPending}>
            Save policy
          </Button>
          <Button onClick={publish} variant="secondary" disabled={isPending}>
            Publish policy
          </Button>
          <Button onClick={unpublish} variant="ghost" disabled={isPending || !policyId}>
            Unpublish policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
