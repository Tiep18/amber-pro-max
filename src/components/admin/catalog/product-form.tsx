'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ListTree, Save, Send } from 'lucide-react';
import {
  publishProductAction,
  saveProductDraftAction,
  type PublishProductResult,
  type SaveProductDraftResult
} from '@/catalog/actions';
import { productDraftSchema, type ProductDraftInput } from '@/catalog/schemas';
import type { CatalogLocale, ProductType } from '@/catalog/types';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';

export type CatalogOption = {
  id: string;
  label: string;
};

export type ProductFormInitial = ProductDraftInput & {
  status?: string;
};

type ProductFormProps = {
  initialProduct?: ProductFormInitial;
  initialNotice?: 'saved';
  categories: CatalogOption[];
  techniques: CatalogOption[];
  tags: CatalogOption[];
  collections: CatalogOption[];
};

type EditorSection = 'basics' | 'content' | 'seo' | 'pricing' | 'taxonomy' | 'publish';
type FieldErrors = Record<string, string>;

const emptyTranslation = {
  title: '',
  description: '',
  specifications: '{}',
  slug: '',
  seoTitle: '',
  seoDescription: ''
};

function defaultDraft(): ProductDraftInput {
  return {
    productType: 'pdf_pattern',
    translations: {
      vi: { ...emptyTranslation },
      en: { ...emptyTranslation }
    },
    categoryIds: [],
    techniqueIds: [],
    tagIds: [],
    collections: [],
    offers: {
      vn: { enabled: false, priceMinor: null },
      intl: { enabled: false, priceMinor: null }
    }
  };
}

function blockerLabel(code: string, locale?: CatalogLocale) {
  const prefix = locale === 'vi' ? 'Vietnamese ' : locale === 'en' ? 'English ' : '';
  const labels: Record<string, string> = {
    missing_translation: `${prefix}translation`,
    missing_slug: `${prefix}slug`,
    missing_seo_title: `${prefix}SEO title`,
    missing_seo_description: `${prefix}SEO description`,
    missing_social_image: `${prefix}social image`,
    missing_primary_image: 'Primary product image',
    missing_market_offer: 'Market offer',
    invalid_market_offer: 'Market offer',
    missing_private_pdf: 'Private PDF',
    invalid_inventory: 'Inventory',
    publish_requirement: 'Publish requirement'
  };
  return labels[code] ?? 'Publish requirement';
}

function numberOrNull(value: string) {
  if (value.trim() === '') {
    return null;
  }
  return Number(value);
}

function readinessTone(ready: boolean) {
  return ready
    ? 'bg-[var(--success-surface)] text-[var(--success)]'
    : 'bg-[var(--warning-surface)] text-[var(--warning)]';
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function seoDescriptionFrom(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 155);
}

const editorSections: Array<{ id: EditorSection; label: string; description: string }> = [
  { id: 'basics', label: 'Product details', description: 'Type and draft identity' },
  { id: 'content', label: 'Content', description: 'Vietnamese and English copy' },
  { id: 'pricing', label: 'Market offers', description: 'Availability and pricing' },
  { id: 'taxonomy', label: 'Organization', description: 'Categories and collections' },
  { id: 'seo', label: 'Search and SEO', description: 'Localized URLs and snippets' },
  { id: 'publish', label: 'Readiness', description: 'Final checks and workflows' }
];

function fieldDomId(path: string) {
  return `product-field-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function sectionForPath(path: string): EditorSection {
  if (path.startsWith('translations.')) {
    return path.endsWith('.slug') || path.includes('.seoTitle') || path.includes('.seoDescription')
      ? 'seo'
      : 'content';
  }
  if (path.startsWith('offers.')) return 'pricing';
  if (
    path.startsWith('categoryIds') ||
    path.startsWith('techniqueIds') ||
    path.startsWith('tagIds') ||
    path.startsWith('collections')
  ) {
    return 'taxonomy';
  }
  if (path === 'productId') return 'publish';
  return 'basics';
}

function validationMessage(code: string, path: string) {
  const messages: Record<string, string> = {
    'Too small: expected string to have >=1 characters': 'Enter a title before saving.',
    specifications_must_be_object: 'Specifications must be a JSON object.',
    specifications_must_be_json: 'Enter valid JSON, for example {"skillLevel":"easy"}.',
    enabled_market_requires_price: 'Enter a price for this enabled market.',
    save_before_publish: 'Save the draft before publishing.',
    missing_translation: 'Add the localized product title before publishing.',
    missing_slug: 'Add a localized slug before publishing.',
    missing_seo_title: 'Add a localized SEO title before publishing.',
    missing_seo_description: 'Add a localized SEO description before publishing.',
    missing_market_offer: 'Enable at least one market and enter its price.',
    invalid_market_offer: 'Check the enabled market price.',
    missing_social_image: 'Add a social image in the media workflow.',
    missing_primary_image: 'Add a primary image in the media workflow.',
    missing_private_pdf: 'Upload the protected PDF in the media workflow.',
    invalid_inventory: 'Check variants and inventory before publishing.',
    publish_requirement: 'Complete this publishing requirement.'
  };
  if (messages[code]) return messages[code];
  if (path.endsWith('.title')) return 'Enter a product title before saving.';
  if (path.endsWith('.slug')) return 'Use lowercase letters, numbers, and hyphens only.';
  return 'Check this value and try again.';
}

function pathForPublishIssue(issue: {
  group: string;
  field: string;
  locale?: CatalogLocale;
  marketCode?: 'vn' | 'intl';
}) {
  if (issue.group === 'translation') {
    const field = issue.field === 'translation' ? 'title' : issue.field;
    return `translations.${issue.locale ?? 'vi'}.${field}`;
  }
  if (issue.group === 'offers') {
    return `offers.${issue.marketCode ?? 'vn'}.priceMinor`;
  }
  return 'productId';
}

function OptionChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold">
      {label}
      <button
        type="button"
        className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        x
      </button>
    </span>
  );
}

function OptionMultiSelect({
  label,
  options,
  selectedIds,
  onChange
}: {
  label: string;
  options: CatalogOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options
    .filter((option) => !selectedIds.includes(option.id))
    .filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">
          {selected.length} selected
        </span>
      </div>
      <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="mb-3 flex min-h-8 flex-wrap gap-2">
          {selected.length ? (
            selected.map((option) => (
              <OptionChip
                key={option.id}
                label={option.label}
                onRemove={() => onChange(selectedIds.filter((id) => id !== option.id))}
              />
            ))
          ) : (
            <span className="text-sm text-[var(--muted-foreground)]">
              No {label.toLowerCase()} selected
            </span>
          )}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-10 text-sm"
          placeholder={`Search ${label.toLowerCase()}`}
        />
        {available.length ? (
          <div className="mt-2 grid gap-1">
            {available.map((option) => (
              <button
                key={option.id}
                type="button"
                className="rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]"
                onClick={() => {
                  onChange([...selectedIds, option.id]);
                  setQuery('');
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LocaleTabs({
  value,
  onChange,
  errorCounts,
  panel
}: {
  value: CatalogLocale;
  onChange: (locale: CatalogLocale) => void;
  errorCounts: Record<CatalogLocale, number>;
  panel: 'content' | 'seo';
}) {
  return (
    <div
      role="tablist"
      aria-label="Content language"
      className="inline-flex rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1"
    >
      {(['vi', 'en'] as const).map((locale) => {
        const selected = value === locale;
        const label = locale === 'vi' ? 'Vietnamese' : 'English';
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            id={`${locale}-${panel}-tab`}
            aria-controls={`${locale}-${panel}-panel`}
            aria-selected={selected}
            onClick={() => onChange(locale)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              selected
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_4px_rgba(92,48,26,0.10)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
            {errorCounts[locale] ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--destructive)] px-1.5 text-xs text-white">
                {errorCounts[locale]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FieldError({ path, errors }: { path: string; errors: FieldErrors }) {
  const message = errors[path];
  return message ? (
    <p id={`${fieldDomId(path)}-error`} role="alert" className="text-sm text-[var(--destructive)]">
      {message}
    </p>
  ) : null;
}

function EditorFormSection({
  id,
  index,
  title,
  description,
  isComplete,
  isActive,
  errorCount,
  children
}: {
  id: EditorSection;
  index: number;
  title: string;
  description: string;
  isComplete?: boolean;
  isActive: boolean;
  errorCount: number;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <Card
        className={`overflow-hidden p-0 transition-[border-color,box-shadow,background-color] duration-200 ${
          isActive
            ? 'border-[var(--accent)] bg-[var(--surface)] shadow-[0_14px_36px_rgba(92,48,26,0.09)]'
            : 'border-[var(--border)]/75 bg-[var(--surface)]/92 shadow-none'
        }`}
      >
        <CardHeader className="mb-0 border-b border-[var(--border)]/65 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-sm font-semibold tabular-nums transition-colors ${
                isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]'
              }`}
            >
              {String(index).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle id={`${id}-heading`} tabIndex={-1} className="text-base outline-none">
                  {title}
                </CardTitle>
                {errorCount ? (
                  <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-[var(--destructive-surface)] px-2 py-1 text-xs font-semibold text-[var(--destructive)]">
                    <AlertCircle aria-hidden="true" className="size-3.5" />
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </span>
                ) : isComplete !== undefined ? (
                  <span
                    className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${readinessTone(isComplete)}`}
                  >
                    {isComplete ? 'Ready' : 'Needs review'}
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-4 sm:p-5">{children}</CardContent>
      </Card>
    </section>
  );
}

function SectionNavigation({
  activeSection,
  errorCounts,
  readiness,
  onNavigate
}: {
  activeSection: EditorSection;
  errorCounts: Record<EditorSection, number>;
  readiness: Partial<Record<EditorSection, boolean>>;
  onNavigate: (section: EditorSection) => void;
}) {
  return (
    <nav aria-label="Product form sections" className="grid gap-1">
      {editorSections.map((section, index) => {
        const isActive = section.id === activeSection;
        const errorCount = errorCounts[section.id];
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? 'step' : undefined}
            onClick={() => onNavigate(section.id)}
            className={`group grid min-h-11 grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <span className={`text-xs tabular-nums ${isActive ? 'text-white/75' : ''}`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="truncate font-semibold">{section.label}</span>
            <span className="flex justify-end">
              {errorCount ? (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    isActive
                      ? 'bg-white text-[var(--destructive)]'
                      : 'bg-[var(--destructive-surface)] text-[var(--destructive)]'
                  }`}
                >
                  {errorCount}
                </span>
              ) : readiness[section.id] ? (
                <Check
                  aria-label="Ready"
                  className={`size-4 ${isActive ? 'text-white' : 'text-[var(--success)]'}`}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${isActive ? 'bg-white/65' : 'bg-[var(--border)]'}`}
                />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function ProductForm({
  initialProduct,
  initialNotice,
  categories,
  techniques,
  tags,
  collections
}: ProductFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraftInput>(initialProduct ?? defaultDraft());
  const [result, setResult] = useState<SaveProductDraftResult | PublishProductResult | null>(
    initialNotice === 'saved' && initialProduct?.productId
      ? { status: 'saved', productId: initialProduct.productId }
      : null
  );
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<EditorSection>('basics');
  const [contentLocale, setContentLocale] = useState<CatalogLocale>('vi');
  const [seoLocale, setSeoLocale] = useState<CatalogLocale>('vi');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [savedSignature, setSavedSignature] = useState(() =>
    JSON.stringify(initialProduct ?? draft)
  );
  const manualNavigationUntil = useRef(0);
  const productId = draft.productId;
  const blockedIssues = result?.status === 'blocked' ? result.issues : [];
  const viReady = Boolean(
    draft.translations.vi.title &&
    draft.translations.vi.slug &&
    draft.translations.vi.seoTitle &&
    draft.translations.vi.seoDescription
  );
  const enReady = Boolean(
    draft.translations.en.title &&
    draft.translations.en.slug &&
    draft.translations.en.seoTitle &&
    draft.translations.en.seoDescription
  );
  const vnOfferReady = draft.offers.vn.enabled && draft.offers.vn.priceMinor !== null;
  const intlOfferReady = draft.offers.intl.enabled && draft.offers.intl.priceMinor !== null;
  const readinessItems = [
    { label: 'Vietnamese copy', ready: viReady },
    { label: 'English copy', ready: enReady },
    { label: 'Vietnam offer', ready: vnOfferReady },
    { label: 'International offer', ready: intlOfferReady }
  ];
  const readyItemCount = readinessItems.filter((item) => item.ready).length;
  const hasUnsavedChanges = JSON.stringify(draft) !== savedSignature;
  const activeSectionIndex = editorSections.findIndex((section) => section.id === activeSection);
  const sectionErrorCounts = useMemo(
    () =>
      Object.keys(fieldErrors).reduce<Record<EditorSection, number>>(
        (counts, path) => {
          counts[sectionForPath(path)] += 1;
          return counts;
        },
        { basics: 0, content: 0, seo: 0, pricing: 0, taxonomy: 0, publish: 0 }
      ),
    [fieldErrors]
  );
  const contentLocaleErrorCounts = useMemo(
    () => ({
      vi: Object.keys(fieldErrors).filter(
        (path) =>
          path.startsWith('translations.vi.') &&
          !path.endsWith('.slug') &&
          !path.includes('.seoTitle') &&
          !path.includes('.seoDescription')
      ).length,
      en: Object.keys(fieldErrors).filter(
        (path) =>
          path.startsWith('translations.en.') &&
          !path.endsWith('.slug') &&
          !path.includes('.seoTitle') &&
          !path.includes('.seoDescription')
      ).length
    }),
    [fieldErrors]
  );
  const seoLocaleErrorCounts = useMemo(
    () => ({
      vi: Object.keys(fieldErrors).filter(
        (path) => path.startsWith('translations.vi.') && sectionForPath(path) === 'seo'
      ).length,
      en: Object.keys(fieldErrors).filter(
        (path) => path.startsWith('translations.en.') && sectionForPath(path) === 'seo'
      ).length
    }),
    [fieldErrors]
  );
  const sectionReadiness: Partial<Record<EditorSection, boolean>> = {
    basics: Boolean(draft.productType),
    content: Boolean(draft.translations.vi.title && draft.translations.en.title),
    pricing: vnOfferReady || intlOfferReady,
    seo: viReady && enReady,
    publish: viReady && enReady && (vnOfferReady || intlOfferReady)
  };

  const selectedCollections = useMemo(
    () =>
      new Map(
        draft.collections.map((collection) => [collection.collectionId, collection.displayOrder])
      ),
    [draft.collections]
  );

  function updateTranslation(
    locale: CatalogLocale,
    field: keyof ProductDraftInput['translations']['en'],
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: {
          ...current.translations[locale],
          [field]: value
        }
      }
    }));
    clearFieldError(`translations.${locale}.${field}`);
  }

  function clearFieldError(path: string) {
    setFieldErrors((current) => {
      if (!current[path]) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  }

  function invalidFieldClass(path: string, base = '') {
    return `${base} ${
      fieldErrors[path]
        ? 'border-[var(--destructive)] ring-2 ring-[var(--destructive)]/15 focus-visible:ring-[var(--destructive)]'
        : ''
    }`.trim();
  }

  function updateCollectionIds(nextIds: string[]) {
    setDraft((current) => ({
      ...current,
      collections: nextIds.map((collectionId) => ({
        collectionId,
        displayOrder:
          current.collections.find((collection) => collection.collectionId === collectionId)
            ?.displayOrder ?? 0
      }))
    }));
  }

  function updateCollectionOrder(id: string, displayOrder: number) {
    setDraft((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.collectionId === id ? { ...collection, displayOrder } : collection
      )
    }));
  }

  function updateOffer(
    market: 'vn' | 'intl',
    field: 'enabled' | 'priceMinor',
    value: boolean | number | null
  ) {
    setDraft((current) => ({
      ...current,
      offers: {
        ...current.offers,
        [market]: {
          ...current.offers[market],
          [field]: value
        }
      }
    }));
    clearFieldError(`offers.${market}.${field}`);
  }

  function generateSlug(locale: CatalogLocale) {
    updateTranslation(locale, 'slug', slugify(draft.translations[locale].title));
  }

  function copyTitleToSeo(locale: CatalogLocale) {
    updateTranslation(locale, 'seoTitle', draft.translations[locale].title);
  }

  function summarizeDescriptionToSeo(locale: CatalogLocale) {
    updateTranslation(
      locale,
      'seoDescription',
      seoDescriptionFrom(draft.translations[locale].description)
    );
  }

  useEffect(() => {
    const elements = editorSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualNavigationUntil.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const nextId = visible[0]?.target.id as EditorSection | undefined;
        if (nextId) setActiveSection(nextId);
      },
      { rootMargin: '-112px 0px -68% 0px', threshold: [0, 0.15, 0.4] }
    );

    elements.forEach((element) => observer.observe(element));
    const handleBottom = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        setActiveSection('publish');
      }
    };
    window.addEventListener('scroll', handleBottom, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleBottom);
    };
  }, []);

  function navigateToSection(section: EditorSection) {
    manualNavigationUntil.current = Date.now() + 700;
    setActiveSection(section);
    setMobileOutlineOpen(false);
    document.getElementById(section)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function navigateToField(path: string) {
    const section = sectionForPath(path);
    if (path.startsWith('translations.vi.')) {
      if (section === 'seo') setSeoLocale('vi');
      else setContentLocale('vi');
    }
    if (path.startsWith('translations.en.')) {
      if (section === 'seo') setSeoLocale('en');
      else setContentLocale('en');
    }
    manualNavigationUntil.current = Date.now() + 900;
    setActiveSection(section);
    setMobileOutlineOpen(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const field =
          document.getElementById(fieldDomId(path)) ??
          document.getElementById(`${section}-heading`);
        field?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'center'
        });
        window.setTimeout(() => field?.focus({ preventScroll: true }), 250);
      });
    });
  }

  function showValidationIssues(issues: Array<{ path: string; code: string }>) {
    const nextErrors = issues.reduce<FieldErrors>((errors, issue) => {
      errors[issue.path] = validationMessage(issue.code, issue.path);
      return errors;
    }, {});
    setFieldErrors(nextErrors);
    if (issues[0]) navigateToField(issues[0].path);
  }

  function saveDraft() {
    const parsed = productDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.message
      }));
      setResult({ status: 'invalid', issues });
      showValidationIssues(issues);
      return;
    }

    startTransition(async () => {
      const actionResult = await saveProductDraftAction(draft);
      setResult(actionResult);
      if (actionResult.status === 'invalid') {
        showValidationIssues(actionResult.issues);
      }
      if (actionResult.status === 'saved') {
        setFieldErrors({});
        setSavedSignature(JSON.stringify(draft));
        if (!draft.productId) {
          setDraft((current) => ({ ...current, productId: actionResult.productId }));
          window.location.assign(`/admin/catalog/${actionResult.productId}?saved=1`);
        } else {
          router.refresh();
        }
      }
    });
  }

  function publishProduct() {
    if (!productId) {
      setResult({
        status: 'invalid',
        issues: [{ path: 'productId', code: 'save_before_publish' }]
      });
      showValidationIssues([{ path: 'productId', code: 'save_before_publish' }]);
      return;
    }
    startTransition(async () => {
      const actionResult = await publishProductAction(productId);
      setResult(actionResult);
      if (actionResult.status === 'blocked') {
        showValidationIssues(
          actionResult.issues.map((issue) => ({
            path: pathForPublishIssue(issue),
            code: issue.code
          }))
        );
      }
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-5 pb-24 lg:space-y-6 lg:pb-0"
      onSubmit={(event) => {
        event.preventDefault();
        saveDraft();
      }}
    >
      {result?.status === 'saved' ? <Alert variant="success">Draft saved</Alert> : null}
      {result?.status === 'published' ? <Alert variant="success">Product published</Alert> : null}
      {result?.status === 'invalid' ? (
        <Alert variant="destructive">Check the highlighted catalog fields.</Alert>
      ) : null}
      {result?.status === 'error' ? (
        <Alert variant="destructive">The catalog action could not be completed.</Alert>
      ) : null}
      {result?.status === 'blocked' ? (
        <Alert variant="warning">
          <AlertTitle>Publishing blocked</AlertTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.locale ?? 'all'}-${index}`}>
                {blockerLabel(issue.code, issue.locale)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="sticky top-20 z-20 lg:hidden">
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border)]/80 bg-[var(--surface)]/95 p-2.5 shadow-[0_12px_30px_rgba(92,48,26,0.10)] backdrop-blur">
          <div className="min-w-0 px-1">
            <p className="truncate text-sm font-semibold">
              {editorSections[activeSectionIndex]?.label}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Section {activeSectionIndex + 1} of {editorSections.length}
            </p>
          </div>
          <Sheet
            open={mobileOutlineOpen}
            onOpenChange={setMobileOutlineOpen}
            triggerLabel="Open section navigator"
            title="Product editor"
            showTriggerLabel
            triggerIcon={<ListTree aria-hidden="true" className="size-4" />}
            triggerClassName="min-h-10 shrink-0 px-3 text-sm"
            bodyClassName="grid content-start gap-5"
          >
            <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{productId ? 'Saved draft' : 'New draft'}</span>
                <span
                  className={hasUnsavedChanges ? 'text-[var(--warning)]' : 'text-[var(--success)]'}
                >
                  {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                </span>
              </div>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {readyItemCount}/{readinessItems.length} readiness checks complete
              </p>
            </div>
            <SectionNavigation
              activeSection={activeSection}
              errorCounts={sectionErrorCounts}
              readiness={sectionReadiness}
              onNavigate={navigateToSection}
            />
          </Sheet>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          <EditorFormSection
            id="basics"
            index={1}
            title="Product basics"
            description="Type and draft state"
            isComplete={Boolean(draft.productType)}
            isActive={activeSection === 'basics'}
            errorCount={sectionErrorCounts.basics}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="block space-y-2">
                <Label htmlFor="product-type">Product type</Label>
                <Select
                  value={draft.productType}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      productType: value as ProductType
                    }))
                  }
                >
                  <SelectTrigger id="product-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf_pattern">PDF pattern</SelectItem>
                    <SelectItem value="physical_finished">Physical finished good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-sm">
                <p className="font-semibold">{productId ? 'Saved draft' : 'New draft'}</p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {initialProduct?.status
                    ? `Current status: ${initialProduct.status}`
                    : 'Save once to unlock media and inventory workflows.'}
                </p>
              </div>
            </div>
          </EditorFormSection>

          <EditorFormSection
            id="content"
            index={2}
            title="Content"
            description="Vietnamese and English copy"
            isComplete={sectionReadiness.content}
            isActive={activeSection === 'content'}
            errorCount={sectionErrorCounts.content}
          >
            <LocaleTabs
              value={contentLocale}
              onChange={setContentLocale}
              errorCounts={contentLocaleErrorCounts}
              panel="content"
            />
            {(() => {
              const locale = contentLocale;
              const label = locale === 'vi' ? 'Vietnamese' : 'English';
              const translation = draft.translations[locale];
              const titlePath = `translations.${locale}.title`;
              const descriptionPath = `translations.${locale}.description`;
              const specificationsPath = `translations.${locale}.specifications`;
              return (
                <div
                  role="tabpanel"
                  id={`${locale}-content-panel`}
                  aria-labelledby={`${locale}-content-tab`}
                  className="grid gap-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/70 p-4"
                >
                  <div>
                    <h3 className="text-base font-semibold">{label} content</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Product-facing copy and specification notes for this locale.
                    </p>
                  </div>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} title</span>
                    <Input
                      id={fieldDomId(titlePath)}
                      aria-invalid={Boolean(fieldErrors[titlePath])}
                      aria-describedby={
                        fieldErrors[titlePath] ? `${fieldDomId(titlePath)}-error` : undefined
                      }
                      className={invalidFieldClass(titlePath)}
                      value={translation.title}
                      onChange={(event) => updateTranslation(locale, 'title', event.target.value)}
                    />
                    <FieldError path={titlePath} errors={fieldErrors} />
                  </label>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} description</span>
                    <Textarea
                      id={fieldDomId(descriptionPath)}
                      aria-invalid={Boolean(fieldErrors[descriptionPath])}
                      aria-describedby={
                        fieldErrors[descriptionPath]
                          ? `${fieldDomId(descriptionPath)}-error`
                          : undefined
                      }
                      className={invalidFieldClass(descriptionPath, 'min-h-32')}
                      value={translation.description}
                      onChange={(event) =>
                        updateTranslation(locale, 'description', event.target.value)
                      }
                    />
                    <FieldError path={descriptionPath} errors={fieldErrors} />
                  </label>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} specifications JSON</span>
                    <Textarea
                      id={fieldDomId(specificationsPath)}
                      aria-invalid={Boolean(fieldErrors[specificationsPath])}
                      aria-describedby={
                        fieldErrors[specificationsPath]
                          ? `${fieldDomId(specificationsPath)}-error`
                          : undefined
                      }
                      className={invalidFieldClass(
                        specificationsPath,
                        'min-h-24 font-mono text-sm'
                      )}
                      value={String(translation.specifications)}
                      onChange={(event) =>
                        updateTranslation(locale, 'specifications', event.target.value)
                      }
                    />
                    <FieldError path={specificationsPath} errors={fieldErrors} />
                  </label>
                </div>
              );
            })()}
          </EditorFormSection>

          <EditorFormSection
            id="pricing"
            index={3}
            title="Market offers"
            description="Availability and pricing by market"
            isComplete={sectionReadiness.pricing}
            isActive={activeSection === 'pricing'}
            errorCount={sectionErrorCounts.pricing}
          >
            <div className="grid gap-3">
              {[
                {
                  key: 'vn' as const,
                  label: 'Vietnam',
                  currency: 'VND',
                  ready: vnOfferReady
                },
                {
                  key: 'intl' as const,
                  label: 'International',
                  currency: 'USD cents',
                  ready: intlOfferReady
                }
              ].map((market) => (
                <div
                  key={market.key}
                  className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-3 lg:grid-cols-[1fr_160px_220px_150px] lg:items-center"
                >
                  <div>
                    <p className="font-semibold">{market.label}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{market.currency}</p>
                  </div>
                  <Toggle
                    pressed={draft.offers[market.key].enabled}
                    onPressedChange={(pressed) => updateOffer(market.key, 'enabled', pressed)}
                    aria-label={`${market.label} market enabled`}
                    className="min-h-10 justify-self-start border border-[var(--border)] px-3 text-sm data-[state=on]:border-[var(--accent)] data-[state=on]:bg-[var(--accent)] data-[state=on]:text-white"
                  >
                    <Check
                      aria-hidden="true"
                      className={`mr-2 size-4 ${
                        draft.offers[market.key].enabled ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {draft.offers[market.key].enabled ? 'Enabled' : 'Enable'}
                  </Toggle>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Price</span>
                    <Input
                      id={fieldDomId(`offers.${market.key}.priceMinor`)}
                      aria-label={`${market.label} price in ${market.currency}`}
                      type="number"
                      min="0"
                      aria-invalid={Boolean(fieldErrors[`offers.${market.key}.priceMinor`])}
                      aria-describedby={
                        fieldErrors[`offers.${market.key}.priceMinor`]
                          ? `${fieldDomId(`offers.${market.key}.priceMinor`)}-error`
                          : undefined
                      }
                      className={invalidFieldClass(`offers.${market.key}.priceMinor`, 'min-h-10')}
                      value={draft.offers[market.key].priceMinor ?? ''}
                      onChange={(event) =>
                        updateOffer(market.key, 'priceMinor', numberOrNull(event.target.value))
                      }
                    />
                    <FieldError path={`offers.${market.key}.priceMinor`} errors={fieldErrors} />
                  </label>
                  <span
                    className={`rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${readinessTone(market.ready)}`}
                  >
                    {market.ready ? 'Ready' : 'Needs price'}
                  </span>
                </div>
              ))}
            </div>
          </EditorFormSection>

          <EditorFormSection
            id="taxonomy"
            index={4}
            title="Taxonomy and collections"
            description="Search, select, and order catalog grouping"
            isActive={activeSection === 'taxonomy'}
            errorCount={sectionErrorCounts.taxonomy}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <OptionMultiSelect
                label="Categories"
                options={categories}
                selectedIds={draft.categoryIds}
                onChange={(nextIds) =>
                  setDraft((current) => ({ ...current, categoryIds: nextIds }))
                }
              />
              <OptionMultiSelect
                label="Techniques"
                options={techniques}
                selectedIds={draft.techniqueIds}
                onChange={(nextIds) =>
                  setDraft((current) => ({ ...current, techniqueIds: nextIds }))
                }
              />
              <OptionMultiSelect
                label="Tags"
                options={tags}
                selectedIds={draft.tagIds}
                onChange={(nextIds) => setDraft((current) => ({ ...current, tagIds: nextIds }))}
              />
            </div>
            <OptionMultiSelect
              label="Collections"
              options={collections}
              selectedIds={draft.collections.map((collection) => collection.collectionId)}
              onChange={updateCollectionIds}
            />
            {draft.collections.length ? (
              <div className="grid gap-2">
                <p className="text-sm font-semibold">Collection display order</p>
                {draft.collections.map((collection) => {
                  const option = collections.find((item) => item.id === collection.collectionId);
                  return (
                    <label
                      key={collection.collectionId}
                      className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3 sm:grid-cols-[1fr_160px] sm:items-center"
                    >
                      <span className="font-semibold">{option?.label ?? 'Collection'}</span>
                      <Input
                        aria-label={`${option?.label ?? 'Collection'} display order`}
                        type="number"
                        min="0"
                        className="min-h-10"
                        value={selectedCollections.get(collection.collectionId) ?? 0}
                        onChange={(event) =>
                          updateCollectionOrder(collection.collectionId, Number(event.target.value))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            ) : null}
          </EditorFormSection>

          <EditorFormSection
            id="seo"
            index={5}
            title="SEO"
            description="Slugs and search snippets"
            isComplete={sectionReadiness.seo}
            isActive={activeSection === 'seo'}
            errorCount={sectionErrorCounts.seo}
          >
            <LocaleTabs
              value={seoLocale}
              onChange={setSeoLocale}
              errorCounts={seoLocaleErrorCounts}
              panel="seo"
            />
            {(() => {
              const locale = seoLocale;
              const label = locale === 'vi' ? 'Vietnamese' : 'English';
              const translation = draft.translations[locale];
              const slugPath = `translations.${locale}.slug`;
              const titlePath = `translations.${locale}.seoTitle`;
              const descriptionPath = `translations.${locale}.seoDescription`;
              return (
                <div
                  role="tabpanel"
                  id={`${locale}-seo-panel`}
                  aria-labelledby={`${locale}-seo-tab`}
                  className="grid gap-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/70 p-4"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{label} search preview</h3>
                      <p className="mt-1 max-w-xl text-sm text-[var(--muted-foreground)]">
                        Prepare the localized URL and search result without retyping product copy.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 text-xs"
                        onClick={() => generateSlug(locale)}
                      >
                        Generate slug
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 text-xs"
                        onClick={() => copyTitleToSeo(locale)}
                      >
                        Use product title
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 text-xs"
                        onClick={() => summarizeDescriptionToSeo(locale)}
                      >
                        Use summary
                      </Button>
                    </div>
                  </div>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} slug</span>
                    <Input
                      id={fieldDomId(slugPath)}
                      aria-invalid={Boolean(fieldErrors[slugPath])}
                      aria-describedby={
                        fieldErrors[slugPath] ? `${fieldDomId(slugPath)}-error` : undefined
                      }
                      className={invalidFieldClass(slugPath)}
                      value={translation.slug}
                      onChange={(event) => updateTranslation(locale, 'slug', event.target.value)}
                    />
                    <FieldError path={slugPath} errors={fieldErrors} />
                  </label>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} SEO title</span>
                    <Input
                      id={fieldDomId(titlePath)}
                      aria-invalid={Boolean(fieldErrors[titlePath])}
                      aria-describedby={
                        fieldErrors[titlePath] ? `${fieldDomId(titlePath)}-error` : undefined
                      }
                      className={invalidFieldClass(titlePath)}
                      value={translation.seoTitle}
                      onChange={(event) =>
                        updateTranslation(locale, 'seoTitle', event.target.value)
                      }
                    />
                    <FieldError path={titlePath} errors={fieldErrors} />
                  </label>
                  <label className="grid gap-2">
                    <span className="font-semibold">{label} SEO description</span>
                    <Textarea
                      id={fieldDomId(descriptionPath)}
                      aria-invalid={Boolean(fieldErrors[descriptionPath])}
                      aria-describedby={
                        fieldErrors[descriptionPath]
                          ? `${fieldDomId(descriptionPath)}-error`
                          : undefined
                      }
                      className={invalidFieldClass(descriptionPath, 'min-h-24')}
                      value={translation.seoDescription}
                      onChange={(event) =>
                        updateTranslation(locale, 'seoDescription', event.target.value)
                      }
                    />
                    <FieldError path={descriptionPath} errors={fieldErrors} />
                  </label>
                </div>
              );
            })()}
          </EditorFormSection>

          <EditorFormSection
            id="publish"
            index={6}
            title="Publish checklist"
            description="Readiness and next workflows"
            isComplete={sectionReadiness.publish}
            isActive={activeSection === 'publish'}
            errorCount={sectionErrorCounts.publish}
          >
            <div className="grid gap-3 text-sm">
              {fieldErrors.productId ? (
                <p
                  id={`${fieldDomId('productId')}-error`}
                  role="alert"
                  className="rounded-[var(--radius-control)] bg-[var(--destructive-surface)] p-3 font-semibold text-[var(--destructive)]"
                >
                  {fieldErrors.productId}
                </p>
              ) : null}
              <p className="text-[var(--muted-foreground)]">
                Use this checkpoint before publishing. Media, private PDF, and inventory stay in
                their dedicated workflows so the main editor remains fast.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <span
                  className={`rounded-[var(--radius-control)] px-3 py-2 font-semibold ${readinessTone(viReady)}`}
                >
                  Vietnamese content {viReady ? 'ready' : 'needs review'}
                </span>
                <span
                  className={`rounded-[var(--radius-control)] px-3 py-2 font-semibold ${readinessTone(enReady)}`}
                >
                  English content {enReady ? 'ready' : 'needs review'}
                </span>
                <span
                  className={`rounded-[var(--radius-control)] px-3 py-2 font-semibold ${readinessTone(vnOfferReady)}`}
                >
                  Vietnam offer {vnOfferReady ? 'ready' : 'off or missing price'}
                </span>
                <span
                  className={`rounded-[var(--radius-control)] px-3 py-2 font-semibold ${readinessTone(intlOfferReady)}`}
                >
                  International offer {intlOfferReady ? 'ready' : 'off or missing price'}
                </span>
              </div>
              {productId ? (
                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)]/65 pt-3">
                  <Link
                    className="font-semibold text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/media`}
                  >
                    Manage media and PDF
                  </Link>
                  <Link
                    className="font-semibold text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/variants`}
                  >
                    Manage variants and inventory
                  </Link>
                </div>
              ) : null}
            </div>
          </EditorFormSection>
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
          <Card className="flex h-full max-h-full flex-col overflow-hidden p-0">
            <div className="border-b border-[var(--border)]/65 bg-[var(--surface-muted)]/75 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                    {productId ? 'Draft in progress' : 'New catalog item'}
                  </p>
                  <CardTitle className="mt-1 truncate text-base">
                    {draft.translations.vi.title ||
                      draft.translations.en.title ||
                      'Untitled product'}
                  </CardTitle>
                </div>
                <span
                  className={`shrink-0 rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${
                    hasUnsavedChanges
                      ? 'bg-[var(--warning-surface)] text-[var(--warning)]'
                      : 'bg-[var(--success-surface)] text-[var(--success)]'
                  }`}
                >
                  {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>{draft.productType === 'pdf_pattern' ? 'PDF pattern' : 'Handmade item'}</span>
                <span aria-hidden="true">/</span>
                <span className="tabular-nums">
                  {readyItemCount}/{readinessItems.length} checks
                </span>
                {blockedIssues.length ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <button
                      type="button"
                      className="font-semibold text-[var(--warning)]"
                      onClick={() => navigateToSection('publish')}
                    >
                      {blockedIssues.length} blockers
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
              <SectionNavigation
                activeSection={activeSection}
                errorCounts={sectionErrorCounts}
                readiness={sectionReadiness}
                onNavigate={navigateToSection}
              />

              <Separator />

              <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm">
                {productId ? (
                  <>
                    <Link
                      className="font-semibold text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/media`}
                    >
                      Media and PDF
                    </Link>
                    <Link
                      className="font-semibold text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/variants`}
                    >
                      Variants and inventory
                    </Link>
                  </>
                ) : (
                  <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                    Save once to unlock media, PDF, variants, and inventory.
                  </p>
                )}
              </div>

              <div className="mt-auto grid gap-2 border-t border-[var(--border)]/65 pt-3">
                <Button type="submit" disabled={isPending} className="gap-2 text-sm">
                  <Save aria-hidden="true" className="size-4" />
                  {isPending ? 'Saving...' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending || !productId}
                  onClick={publishProduct}
                  className="gap-2 text-sm"
                >
                  <Send aria-hidden="true" className="size-4" />
                  Publish product
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)]/75 bg-[var(--surface)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_30px_rgba(92,48,26,0.10)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          <Button type="submit" disabled={isPending} className="gap-2 text-sm">
            <Save aria-hidden="true" className="size-4" />
            {isPending ? 'Saving...' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || !productId}
            onClick={publishProduct}
            className="gap-2 text-sm"
          >
            <Send aria-hidden="true" className="size-4" />
            Publish
          </Button>
        </div>
      </div>
    </form>
  );
}
