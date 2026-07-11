'use client';

import { type ChangeEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileCheck2, Languages, Save, Send } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminStatusPill } from '@/components/admin/admin-page';
import {
  publishPolicyAction,
  savePolicyDraftAction,
  unpublishPolicyAction
} from '@/policies/actions';
import type { PolicyPublishBlocker } from '@/policies/publish-checks';
import type { PolicyDraftInput, PolicyKind, PolicyLocale } from '@/policies/schemas';
import type { PolicyFormInitial } from '@/policies/queries';
import { cn } from '@/lib/utils';
import { isPolicyLocaleDraftReady, mapPolicyValidationIssues } from './policy-form-validation';

type TranslationState = PolicyFormInitial['translations']['en'];
type PolicyField = keyof TranslationState;

export const policyKindLabels: Record<PolicyKind, string> = {
  privacy: 'Privacy policy',
  terms_of_sale: 'Terms of sale',
  returns: 'Physical return policy',
  digital_downloads: 'Digital download policy'
};

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

function PolicyFieldControl({
  label,
  id,
  value,
  error,
  required,
  multiline,
  rows,
  className,
  onChange
}: {
  label: string;
  id: string;
  value: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  onChange: (value: string) => void;
}) {
  const shared = {
    id,
    value,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    className: cn(
      error && 'border-[var(--destructive)] ring-1 ring-[var(--destructive)]',
      className
    ),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value)
  };
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-semibold">
      <span className="flex items-center justify-between gap-3">
        {label}
        {required ? (
          <span className="text-xs font-normal text-[var(--muted-foreground)]">Required</span>
        ) : null}
      </span>
      {multiline ? <Textarea {...shared} rows={rows} /> : <Input {...shared} />}
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="text-xs font-semibold text-[var(--destructive)]"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function PolicyForm({
  policyKind,
  initialPolicy
}: {
  policyKind: PolicyKind;
  initialPolicy?: PolicyFormInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [policyId, setPolicyId] = useState(initialPolicy?.policyId);
  const [status, setStatus] = useState(initialPolicy?.status ?? 'draft');
  const [locale, setLocale] = useState<PolicyLocale>('vi');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<PolicyPublishBlocker[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<PolicyLocale, TranslationState>>(
    initialPolicy?.translations ?? { vi: { ...emptyTranslation }, en: { ...emptyTranslation } }
  );

  const fieldPath = (field: PolicyField) => `translations.${locale}.${field}`;
  const controlId = (field: PolicyField) => `${policyKind}-${fieldPath(field)}`;
  const updateTranslation = (field: PolicyField, value: string) => {
    const path = fieldPath(field);
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], [field]: value }
    }));
    setFieldErrors((current) => {
      if (!current[path]) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  };
  const payload = (): PolicyDraftInput => ({
    ...(policyId ? { policyId } : {}),
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
  });
  const resetFeedback = () => {
    setNotice(null);
    setError(null);
    setBlockers([]);
  };

  const saveDraft = () => {
    resetFeedback();
    startTransition(async () => {
      const result = await savePolicyDraftAction(payload());
      if (result.status === 'saved') {
        setPolicyId(result.policyId);
        setFieldErrors({});
        setNotice('Policy saved');
        router.refresh();
        return;
      }
      if (result.status === 'invalid') {
        const mapped = mapPolicyValidationIssues(result.issues);
        setFieldErrors(mapped.fields);
        if (mapped.firstLocale) setLocale(mapped.firstLocale);
        const firstMessage = mapped.firstPath ? mapped.fields[mapped.firstPath] : null;
        setError(
          firstMessage
            ? `Review the highlighted fields. First issue: ${firstMessage}`
            : 'Review the highlighted fields.'
        );
        if (mapped.firstPath)
          requestAnimationFrame(() =>
            document.getElementById(`${policyKind}-${mapped.firstPath}`)?.focus()
          );
        return;
      }
      setError('This content could not be saved.');
    });
  };
  const publish = () => {
    if (!policyId) {
      setError('Save the policy before publishing.');
      return;
    }
    resetFeedback();
    startTransition(async () => {
      const result = await publishPolicyAction(policyId);
      if (result.status === 'published') {
        setStatus('published');
        setNotice('Policy published');
        router.refresh();
        return;
      }
      if (result.status === 'blocked') {
        setBlockers(result.issues);
        if (result.issues[0]?.locale) setLocale(result.issues[0].locale);
        return;
      }
      setError('This content could not be published.');
    });
  };
  const unpublish = () => {
    if (!policyId) return;
    resetFeedback();
    startTransition(async () => {
      const result = await unpublishPolicyAction(policyId);
      if (result.status === 'unpublished') {
        setStatus('draft');
        setNotice('Policy unpublished');
        router.refresh();
        return;
      }
      setError('This content could not be unpublished.');
    });
  };

  const language = locale === 'vi' ? 'Vietnamese' : 'English';
  return (
    <section
      aria-label={policyKindLabels[policyKind]}
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]"
    >
      <header className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Legal content</p>
          <h2 className="mt-1 text-xl font-semibold">{policyKindLabels[policyKind]}</h2>
        </div>
        <div className="flex items-center gap-2">
          <AdminStatusPill tone={status === 'published' ? 'success' : 'warning'}>
            {status}
          </AdminStatusPill>
          <AdminStatusPill
            tone={
              isPolicyLocaleDraftReady(translations.vi) && isPolicyLocaleDraftReady(translations.en)
                ? 'success'
                : 'warning'
            }
          >
            {isPolicyLocaleDraftReady(translations.vi) && isPolicyLocaleDraftReady(translations.en)
              ? 'Draft ready'
              : 'Needs content'}
          </AdminStatusPill>
        </div>
      </header>
      <div
        className="grid grid-cols-2 gap-1 border-b border-[var(--border)] bg-[var(--surface-muted)] p-1.5"
        role="tablist"
        aria-label="Policy language"
      >
        {(['vi', 'en'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={locale === item}
            onClick={() => setLocale(item)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] text-sm font-semibold',
              locale === item ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-foreground)]'
            )}
          >
            <Languages className="size-4" aria-hidden="true" />
            {item === 'vi' ? 'Vietnamese' : 'English'}
            {isPolicyLocaleDraftReady(translations[item]) ? (
              <Check className="size-3.5 text-[var(--success)]" aria-hidden="true" />
            ) : (
              <span className="text-[var(--warning)]">•</span>
            )}
          </button>
        ))}
      </div>
      <div className="grid gap-4 p-5 sm:p-6">
        {notice ? <Alert variant="success">{notice}</Alert> : null}
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {blockers.length ? (
          <Alert variant="warning">
            <AlertTitle>Publishing blocked</AlertTitle>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((issue, index) => (
                <li key={`${issue.code}-${issue.locale ?? 'shared'}-${index}`}>
                  {blockerLabel(issue)}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div>
          <h3 className="font-semibold">{language} policy content</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Customer-facing legal copy for this language.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['title', 'slug'] as const).map((field) => (
            <PolicyFieldControl
              key={field}
              label={`${language} ${field}`}
              id={controlId(field)}
              value={translations[locale][field]}
              error={fieldErrors[fieldPath(field)]}
              required
              onChange={(value) => updateTranslation(field, value)}
            />
          ))}
        </div>
        <PolicyFieldControl
          label={`${language} summary`}
          id={controlId('summary')}
          value={translations[locale].summary}
          error={fieldErrors[fieldPath('summary')]}
          required
          multiline
          rows={3}
          onChange={(value) => updateTranslation('summary', value)}
        />
        <PolicyFieldControl
          label={`${language} body`}
          id={controlId('body')}
          value={translations[locale].body}
          error={fieldErrors[fieldPath('body')]}
          required
          multiline
          className="min-h-[340px] leading-7"
          onChange={(value) => updateTranslation('body', value)}
        />
        <section className="grid gap-4 border-t border-[var(--border)] pt-5">
          <div>
            <h3 className="font-semibold">Search and sharing</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Required search metadata and optional social image storage.
            </p>
          </div>
          {(['seoTitle', 'seoDescription'] as const).map((field) => (
            <PolicyFieldControl
              key={field}
              label={`${language} ${field}`}
              id={controlId(field)}
              value={translations[locale][field]}
              error={fieldErrors[fieldPath(field)]}
              required
              multiline={field === 'seoDescription'}
              rows={3}
              onChange={(value) => updateTranslation(field, value)}
            />
          ))}
          <details className="rounded-[var(--radius-control)] border border-[var(--border)] p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Advanced social image storage
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(['socialImageBucket', 'socialImagePath'] as const).map((field) => (
                <PolicyFieldControl
                  key={field}
                  label={`${language} ${field}`}
                  id={controlId(field)}
                  value={translations[locale][field]}
                  error={fieldErrors[fieldPath(field)]}
                  onChange={(value) => updateTranslation(field, value)}
                />
              ))}
            </div>
          </details>
        </section>
      </div>
      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3 backdrop-blur">
        <Button
          onClick={unpublish}
          variant="ghost"
          disabled={isPending || !policyId || status !== 'published'}
          className="min-h-10 px-3 text-sm"
        >
          Unpublish
        </Button>
        <Button
          onClick={publish}
          variant="secondary"
          disabled={isPending || !policyId}
          className="min-h-10 gap-2 px-3 text-sm"
        >
          <Send className="size-4" aria-hidden="true" />
          Publish policy
        </Button>
        <Button onClick={saveDraft} disabled={isPending} className="min-h-10 gap-2 px-3 text-sm">
          {isPending ? (
            <FileCheck2 className="size-4" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {isPending ? 'Saving...' : 'Save policy'}
        </Button>
      </footer>
    </section>
  );
}
