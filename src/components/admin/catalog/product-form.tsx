'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ImageIcon,
  ListTree,
  Package,
  Save,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import {
  saveAndPublishProductAction,
  saveProductDraftAction,
  type PublishProductResult,
  type SaveProductDraftResult
} from '@/catalog/actions';
import { productDraftSchema, type ProductDraftInput } from '@/catalog/schemas';
import type { CatalogLocale, ProductType } from '@/catalog/types';
import {
  reconcileCollectionMemberships,
  type CatalogCollectionOption
} from '@/catalog/collection-ordering';
import {
  ShippingAssignmentSheet,
  type ShippingAssignmentProfile,
  type ShippingProfileOption
} from '@/components/admin/commerce/shipping-assignment-sheet';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useProductFormScrollspy } from '@/components/admin/catalog/use-product-form-scrollspy';

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
  collections: CatalogCollectionOption[];
  shippingProfiles?: ShippingProfileOption[];
  storeDefaultShippingProfile?: ShippingAssignmentProfile | null;
  shippingAssignment?: {
    explicitProfileId: string | null;
    effectiveProfile: ShippingAssignmentProfile | null;
    effectiveSource: 'Product' | 'Store default';
  };
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
    incompatible_product_data: 'Product type data',
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
const editorSectionIds = editorSections.map((section) => section.id);

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
    incompatible_product_data:
      'Remove variants, inventory, shipping, or PDF data owned by the previous product type.',
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
    <span className="inline-flex h-7 items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-paper)] pl-2.5 pr-1 text-xs font-medium">
      {label}
      <button
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive-surface)] hover:text-[var(--destructive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        ×
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
    <div className="grid content-start gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
        {selected.length ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[0.625rem] font-semibold text-white">
            {selected.length}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[1.75rem] flex-wrap items-center gap-1.5">
        {selected.length ? (
          selected.map((option) => (
            <OptionChip
              key={option.id}
              label={option.label}
              onRemove={() => onChange(selectedIds.filter((id) => id !== option.id))}
            />
          ))
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">None</span>
        )}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-9 text-sm"
        placeholder={`Add ${label.toLowerCase()}…`}
      />
      {available.length ? (
        <div className="flex flex-wrap gap-1">
          {available.map((option) => (
            <button
              key={option.id}
              type="button"
              className="h-7 rounded-full border border-dashed border-[var(--border)] px-2.5 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-blush)]/40 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              onClick={() => {
                onChange([...selectedIds, option.id]);
                setQuery('');
              }}
            >
              + {option.label}
            </button>
          ))}
        </div>
      ) : null}
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
      className="inline-flex max-w-full rounded-[var(--radius-control)] border border-[var(--border)]/80 bg-[var(--surface-muted)]/70 p-1"
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
            className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              selected
                ? 'bg-[var(--surface-paper)] text-[var(--foreground)] shadow-[0_1px_3px_rgba(92,48,26,0.07)]'
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

const localizedPanelClassName = 'grid gap-3.5';
const localizedFieldClassName = 'grid gap-1.5';

function FieldError({ path, errors }: { path: string; errors: FieldErrors }) {
  const message = errors[path];
  return message ? (
    <p
      id={`${fieldDomId(path)}-error`}
      role="alert"
      className="text-sm leading-5 text-[var(--destructive)]"
    >
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
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-[var(--product-form-anchor-offset)]"
    >
      <Card
        className={`relative overflow-hidden bg-[var(--surface-paper)] p-0 shadow-[0_1px_4px_rgba(92,48,26,0.05)] transition-[border-color,box-shadow] duration-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-[''] ${
          isActive
            ? 'border-[var(--accent)]/50 shadow-[0_2px_8px_rgba(169,71,52,0.08)] before:bg-[var(--accent)]'
            : 'border-[var(--border)] before:bg-[var(--border)]/70'
        }`}
      >
        <CardHeader className="mb-0 border-b border-[var(--border)]/60 bg-[var(--surface)]/30 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border text-xs font-semibold tabular-nums transition-colors ${
                isActive
                  ? 'border-[var(--accent)]/40 bg-[var(--surface-blush)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--muted-foreground)]'
              }`}
            >
              {String(index).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle
                  id={`${id}-heading`}
                  tabIndex={-1}
                  className="text-[0.95rem] outline-none"
                >
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
              <p className="text-sm leading-5 text-[var(--muted-foreground)]">{description}</p>
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
            className={`group relative grid min-h-11 grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 overflow-hidden rounded-[var(--radius-control)] border px-2.5 text-left text-sm transition-[border-color,background-color,color] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              isActive
                ? 'border-[var(--accent)]/25 bg-[var(--surface-blush)]/70 text-[var(--foreground)] before:bg-[var(--accent)]'
                : 'border-transparent text-[var(--muted-foreground)] before:bg-transparent hover:border-[var(--border)]/60 hover:bg-[var(--surface-muted)]/60 hover:text-[var(--foreground)]'
            }`}
          >
            <span
              className={`text-xs tabular-nums ${isActive ? 'font-semibold text-[var(--accent)]' : ''}`}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="truncate font-semibold">{section.label}</span>
            <span className="flex justify-end">
              {errorCount ? (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    isActive
                      ? 'bg-[var(--destructive-surface)] text-[var(--destructive)]'
                      : 'bg-[var(--destructive-surface)] text-[var(--destructive)]'
                  }`}
                >
                  {errorCount}
                </span>
              ) : readiness[section.id] ? (
                <Check aria-label="Ready" className="size-4 text-[var(--success)]" />
              ) : (
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${isActive ? 'bg-[var(--accent)]/55' : 'bg-[var(--border)]'}`}
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
  collections,
  shippingProfiles = [],
  storeDefaultShippingProfile = null,
  shippingAssignment
}: ProductFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraftInput>(initialProduct ?? defaultDraft());
  const [result, setResult] = useState<SaveProductDraftResult | PublishProductResult | null>(
    initialNotice === 'saved' && initialProduct?.productId
      ? { status: 'saved', productId: initialProduct.productId }
      : null
  );
  const [isPending, startTransition] = useTransition();
  const [contentLocale, setContentLocale] = useState<CatalogLocale>('vi');
  const [seoLocale, setSeoLocale] = useState<CatalogLocale>('vi');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [pendingFieldRequest, setPendingFieldRequest] = useState<{
    id: number;
    path: string;
    section: EditorSection;
  } | null>(null);
  const [savedSignature, setSavedSignature] = useState(() =>
    JSON.stringify(initialProduct ?? draft)
  );
  const collectionOrderMemory = useRef(
    new Map(
      (initialProduct?.collections ?? []).map((membership) => [
        membership.collectionId,
        membership.displayOrder
      ])
    )
  );
  const mobileNavigatorRef = useRef<HTMLDivElement>(null);
  const fieldRequestIdRef = useRef(0);
  const {
    activeSection,
    activationBounds,
    cancelNavigation,
    navigateToElement,
    navigateToSection: scrollToSection,
    scrollspyState,
    targetOffset
  } = useProductFormScrollspy<EditorSection>({
    sectionIds: editorSectionIds,
    mobileNavigatorRef
  });
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
  const canAssignShipping = Boolean(
    productId && draft.productType === 'physical_finished' && shippingAssignment
  );
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
    setDraft((current) => {
      for (const membership of current.collections) {
        collectionOrderMemory.current.set(membership.collectionId, membership.displayOrder);
      }
      return {
        ...current,
        collections: reconcileCollectionMemberships(
          nextIds,
          current.collections,
          Array.from(collectionOrderMemory.current, ([collectionId, displayOrder]) => ({
            collectionId,
            displayOrder
          })),
          collections
        )
      };
    });
  }

  function updateCollectionOrder(id: string, displayOrder: number) {
    collectionOrderMemory.current.set(id, displayOrder);
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

  useLayoutEffect(() => {
    if (!pendingFieldRequest) return;
    const { id, path, section } = pendingFieldRequest;
    const field = document.getElementById(fieldDomId(path));
    const target = field ?? document.getElementById(`${section}-heading`);
    if (!target) {
      setPendingFieldRequest((current) => (current?.id === id ? null : current));
      return;
    }

    navigateToElement({
      element: target,
      activeSection: section,
      alignment: field ? 'center' : 'start',
      onCancel: () => {
        setPendingFieldRequest((current) => (current?.id === id ? null : current));
      },
      onComplete: () => {
        setPendingFieldRequest((current) => (current?.id === id ? null : current));
        target.focus({ preventScroll: true });
      }
    });
  }, [navigateToElement, pendingFieldRequest]);

  function navigateToSection(section: EditorSection) {
    setPendingFieldRequest(null);
    if (mobileOutlineOpen) {
      setMobileOutlineOpen(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToSection(section));
      });
      return;
    }
    scrollToSection(section);
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
    cancelNavigation();
    setMobileOutlineOpen(false);
    fieldRequestIdRef.current += 1;
    setPendingFieldRequest({ id: fieldRequestIdRef.current, path, section });
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
      toast.error('Check the highlighted catalog fields.');
      return;
    }

    startTransition(async () => {
      const actionResult = await saveProductDraftAction(draft);
      setResult(actionResult);
      if (actionResult.status === 'invalid') {
        showValidationIssues(actionResult.issues);
        toast.error('Check the highlighted catalog fields.');
      }
      if (actionResult.status === 'saved') {
        toast.success('Draft saved.');
        setFieldErrors({});
        setSavedSignature(JSON.stringify(draft));
        if (!draft.productId) {
          setDraft((current) => ({ ...current, productId: actionResult.productId }));
          router.replace(`/admin/catalog/${actionResult.productId}`);
        } else {
          router.refresh();
        }
      }
      if (actionResult.status === 'error') {
        toast.error('The catalog action could not be completed.');
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
      toast.error('Save the draft before publishing.');
      return;
    }
    const submittedDraft = draft;
    const submittedSignature = JSON.stringify(submittedDraft);
    startTransition(async () => {
      const actionResult = await saveAndPublishProductAction(submittedDraft);
      setResult(actionResult);
      if (actionResult.status === 'invalid' && 'issues' in actionResult) {
        showValidationIssues(actionResult.issues);
        toast.error('Check the highlighted catalog fields.');
      }
      if (actionResult.status === 'blocked') {
        toast.warning('Publishing blocked. Review the checklist.');
        setSavedSignature(submittedSignature);
        showValidationIssues(
          actionResult.issues.map((issue) => ({
            path: pathForPublishIssue(issue),
            code: issue.code
          }))
        );
      }
      if (actionResult.status === 'published') {
        toast.success('Product published.');
        setSavedSignature(submittedSignature);
        setFieldErrors({});
      }
      if (actionResult.status === 'error') {
        toast.error('The catalog action could not be completed.');
      }
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4 pb-24 lg:pb-0"
      data-scrollspy-state={scrollspyState}
      data-scrollspy-target-offset={targetOffset}
      data-scrollspy-activation-bounds={activationBounds}
      style={
        {
          '--product-form-anchor-offset': `${targetOffset}px`
        } as CSSProperties
      }
      onSubmit={(event) => {
        event.preventDefault();
        saveDraft();
      }}
    >
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

      <div ref={mobileNavigatorRef} className="sticky top-20 z-20 lg:hidden">
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-paper)] p-2 shadow-[0_4px_14px_rgba(92,48,26,0.08)] backdrop-blur">
          <div className="min-w-0 px-1.5">
            <p className="truncate text-sm font-semibold leading-5">
              {editorSections[activeSectionIndex]?.label}
            </p>
            <p className="text-[0.7rem] leading-4 text-[var(--muted-foreground)]">
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
            triggerClassName="min-h-11 shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm"
            bodyClassName="grid content-start gap-4"
          >
            <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-paper)] p-3 text-sm">
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="space-y-4">
          <EditorFormSection
            id="basics"
            index={1}
            title="Product basics"
            description="Type and draft state"
            isComplete={Boolean(draft.productType)}
            isActive={activeSection === 'basics'}
            errorCount={sectionErrorCounts.basics}
          >
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">Product type</span>
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
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${productId ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
                />
                {productId
                  ? (initialProduct?.status ?? 'Draft saved')
                  : 'Save to unlock media and inventory'}
              </p>
            </label>
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
                  className={localizedPanelClassName}
                >
                  <div className="border-b border-[var(--border)]/60 pb-3.5">
                    <h3 className="text-[0.95rem] font-semibold">{label} content</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                      Product-facing copy and specification notes for this locale.
                    </p>
                  </div>
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} title</span>
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
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} description</span>
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
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} specifications JSON</span>
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
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'vn' as const,
                  label: 'Vietnam',
                  currency: 'VND',
                  currencyLabel: '₫',
                  ready: vnOfferReady
                },
                {
                  key: 'intl' as const,
                  label: 'International',
                  currency: 'USD cents',
                  currencyLabel: '¢',
                  ready: intlOfferReady
                }
              ].map((market) => {
                const enabled = draft.offers[market.key].enabled;
                return (
                  <div
                    key={market.key}
                    className={`grid gap-3.5 rounded-[var(--radius-control)] border p-3.5 transition-colors ${
                      enabled
                        ? 'border-[var(--accent)]/30 bg-[var(--surface-blush)]/30'
                        : 'border-[var(--border)]/80 bg-[var(--surface)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-semibold">{market.label}</p>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {market.currency}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${readinessTone(market.ready)}`}
                      >
                        {market.ready ? 'Ready' : 'Needs price'}
                      </span>
                    </div>
                    <Toggle
                      pressed={enabled}
                      onPressedChange={(pressed) => updateOffer(market.key, 'enabled', pressed)}
                      aria-label={`${market.label} market enabled`}
                      className={`h-9 w-full justify-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-sm transition-colors ${
                        enabled
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                          : 'border-[var(--border)] bg-[var(--surface-paper)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]'
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        className={`size-3.5 ${enabled ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {enabled ? 'Enabled' : 'Enable market'}
                    </Toggle>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                        Price ({market.currency})
                      </span>
                      <div className="relative">
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
                          className={invalidFieldClass(
                            `offers.${market.key}.priceMinor`,
                            'h-9 pr-8'
                          )}
                          placeholder="0"
                          value={draft.offers[market.key].priceMinor ?? ''}
                          onChange={(event) =>
                            updateOffer(market.key, 'priceMinor', numberOrNull(event.target.value))
                          }
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                          {market.currencyLabel}
                        </span>
                      </div>
                      <FieldError path={`offers.${market.key}.priceMinor`} errors={fieldErrors} />
                    </label>
                  </div>
                );
              })}
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
            <div className="grid gap-5 sm:grid-cols-3">
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
            <div className="grid gap-3 border-t border-[var(--border)]/60 pt-5">
              <OptionMultiSelect
                label="Collections"
                options={collections}
                selectedIds={draft.collections.map((collection) => collection.collectionId)}
                onChange={updateCollectionIds}
              />
              {draft.collections.length ? (
                <div className="grid gap-1.5">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Display order
                  </span>
                  {draft.collections.map((collection) => {
                    const option = collections.find((item) => item.id === collection.collectionId);
                    return (
                      <label
                        key={collection.collectionId}
                        className="flex items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-1.5 transition-colors hover:bg-[var(--surface-muted)]/40"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {option?.label ?? 'Collection'}
                        </span>
                        <Input
                          aria-label={`${option?.label ?? 'Collection'} display order`}
                          type="number"
                          min="0"
                          className="h-8 w-20 shrink-0 text-center text-sm"
                          value={selectedCollections.get(collection.collectionId) ?? 0}
                          onChange={(event) =>
                            updateCollectionOrder(
                              collection.collectionId,
                              Number(event.target.value)
                            )
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
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
                  className={localizedPanelClassName}
                >
                  <div className="grid gap-3 border-b border-[var(--border)]/60 pb-4">
                    <div>
                      <h3 className="text-[0.95rem] font-semibold">{label} search preview</h3>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
                        Prepare the localized URL and search result without retyping product copy.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full px-2.5 text-xs"
                        onClick={() => generateSlug(locale)}
                      >
                        Generate slug
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full px-2.5 text-xs"
                        onClick={() => copyTitleToSeo(locale)}
                      >
                        Use product title
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="col-span-2 min-h-11 w-full px-2.5 text-xs sm:col-span-1"
                        onClick={() => summarizeDescriptionToSeo(locale)}
                      >
                        Use summary
                      </Button>
                    </div>
                  </div>
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} slug</span>
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
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} SEO title</span>
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
                  <label className={localizedFieldClassName}>
                    <span className="text-sm font-semibold">{label} SEO description</span>
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
            <div className="grid gap-5 text-sm">
              <FieldError path="productId" errors={fieldErrors} />
              <div className="grid gap-3">
                <p className="leading-relaxed text-[var(--muted-foreground)]">
                  Use this checkpoint before publishing. Media, private PDF, and inventory stay in
                  their dedicated workflows so the main editor remains fast.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: 'Vietnamese content',
                      ready: viReady,
                      readyText: 'ready',
                      pendingText: 'needs review'
                    },
                    {
                      label: 'English content',
                      ready: enReady,
                      readyText: 'ready',
                      pendingText: 'needs review'
                    },
                    {
                      label: 'Vietnam offer',
                      ready: vnOfferReady,
                      readyText: 'ready',
                      pendingText: 'off or missing price'
                    },
                    {
                      label: 'International offer',
                      ready: intlOfferReady,
                      readyText: 'ready',
                      pendingText: 'off or missing price'
                    }
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`flex items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2.5 text-xs font-semibold leading-5 ${
                        item.ready
                          ? 'border-[var(--success)]/20 bg-[var(--success-surface)] text-[var(--success)]'
                          : 'border-[var(--warning)]/20 bg-[var(--warning-surface)] text-[var(--warning)]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${item.ready ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
                      />
                      <span>
                        {item.label} {item.ready ? item.readyText : item.pendingText}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              {canAssignShipping && shippingAssignment ? (
                <div className="border-t border-[var(--border)]/60 pt-4">
                  <ShippingAssignmentSheet
                    owner={{ type: 'product', productId: productId as string }}
                    profiles={shippingProfiles}
                    explicitProfileId={shippingAssignment.explicitProfileId}
                    effectiveProfile={shippingAssignment.effectiveProfile}
                    effectiveSource={shippingAssignment.effectiveSource}
                    storeDefaultProfile={storeDefaultShippingProfile}
                    title="Parcel profile"
                    description="Product-level assignment used by variants unless a variant override exists."
                  />
                </div>
              ) : draft.productType === 'physical_finished' && !productId ? (
                <div className="border-t border-[var(--border)]/60 pt-4">
                  <div className="rounded-[var(--radius-control)] border border-[var(--border)]/80 bg-[var(--surface)]/50 p-3.5 text-sm text-[var(--muted-foreground)]">
                    Save the product once to choose a parcel profile.
                  </div>
                </div>
              ) : null}
              {productId ? (
                <div className="grid gap-2 border-t border-[var(--border)]/60 pt-4 sm:grid-cols-2">
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-paper)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-blush)]/40 hover:text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/media`}
                  >
                    <ImageIcon
                      aria-hidden="true"
                      className="size-4 text-[var(--muted-foreground)]"
                    />
                    Media and PDF
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto size-3.5 text-[var(--muted-foreground)]"
                    />
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-paper)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-blush)]/40 hover:text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/variants`}
                  >
                    <Package aria-hidden="true" className="size-4 text-[var(--muted-foreground)]" />
                    Variants and inventory
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto size-3.5 text-[var(--muted-foreground)]"
                    />
                  </Link>
                </div>
              ) : null}
            </div>
          </EditorFormSection>
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
          <Card className="flex h-full max-h-full flex-col overflow-hidden border-[var(--border)] bg-[var(--surface-paper)] p-0 shadow-[0_1px_4px_rgba(92,48,26,0.05)]">
            <div className="border-b border-[var(--border)]/60 bg-[var(--surface)]/30 px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
                    {productId ? 'Draft in progress' : 'New catalog item'}
                  </p>
                  <CardTitle className="mt-1 truncate text-[0.95rem]">
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
              <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
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
                      className="rounded-sm font-semibold text-[var(--warning)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                      onClick={() => navigateToSection('publish')}
                    >
                      {blockedIssues.length} blockers
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
              <SectionNavigation
                activeSection={activeSection}
                errorCounts={sectionErrorCounts}
                readiness={sectionReadiness}
                onNavigate={navigateToSection}
              />

              <Separator className="border-[var(--border)]/60" />

              <div className="grid gap-1.5">
                {productId ? (
                  <>
                    <Link
                      className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)]/70 bg-[var(--surface-paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/media`}
                    >
                      <ImageIcon aria-hidden="true" className="size-3.5" />
                      Media and PDF
                      <ArrowRight aria-hidden="true" className="ml-auto size-3" />
                    </Link>
                    <Link
                      className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)]/70 bg-[var(--surface-paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/variants`}
                    >
                      <Package aria-hidden="true" className="size-3.5" />
                      Variants and inventory
                      <ArrowRight aria-hidden="true" className="ml-auto size-3" />
                    </Link>
                  </>
                ) : (
                  <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                    Save once to unlock media, PDF, variants, and inventory.
                  </p>
                )}
              </div>

              <div className="mt-auto grid gap-2 border-t border-[var(--border)]/60 pt-3">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 gap-1.5 px-3 text-sm"
                >
                  <Save aria-hidden="true" className="size-4" />
                  {isPending ? 'Saving...' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending || !productId}
                  onClick={publishProduct}
                  className="min-h-11 gap-1.5 px-3 text-sm"
                >
                  <Send aria-hidden="true" className="size-4" />
                  Publish product
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface-paper)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5 shadow-[0_-4px_16px_rgba(92,48,26,0.09)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          <Button type="submit" disabled={isPending} className="min-h-11 gap-1.5 px-2.5 text-sm">
            <Save aria-hidden="true" className="size-4" />
            {isPending ? 'Saving...' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || !productId}
            onClick={publishProduct}
            className="min-h-11 gap-1.5 px-2.5 text-sm"
          >
            <Send aria-hidden="true" className="size-4" />
            Publish
          </Button>
        </div>
      </div>
    </form>
  );
}
