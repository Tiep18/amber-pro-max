'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  publishProductAction,
  saveProductDraftAction,
  type PublishProductResult,
  type SaveProductDraftResult
} from '@/catalog/actions';
import type { ProductDraftInput } from '@/catalog/schemas';
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
import { Textarea } from '@/components/ui/textarea';

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
  { id: 'basics', label: 'Basics', description: 'Type and draft state' },
  { id: 'content', label: 'Content', description: 'Bilingual product copy' },
  { id: 'seo', label: 'SEO', description: 'Slugs and snippets' },
  { id: 'pricing', label: 'Offers', description: 'Market availability' },
  { id: 'taxonomy', label: 'Taxonomy', description: 'Catalog grouping' },
  { id: 'publish', label: 'Publish', description: 'Final checks' }
];

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

function SmartSection({
  id,
  index,
  title,
  description,
  isComplete,
  isOpen,
  onToggle,
  children
}: {
  id: string;
  index: number;
  title: string;
  description: string;
  isComplete?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = `${id}-content`;

  return (
    <Card
      id={id}
      className={`scroll-mt-28 overflow-hidden p-0 transition-colors ${
        isOpen ? 'bg-[var(--surface)]' : 'bg-[var(--surface-muted)]/70'
      }`}
    >
      <CardHeader className="mb-0 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--background)] text-sm font-semibold tabular-nums text-[var(--muted-foreground)]">
              {String(index).padStart(2, '0')}
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{title}</CardTitle>
                {isComplete !== undefined ? (
                  <span
                    className={`rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold ${
                      isComplete
                        ? 'bg-[var(--success-surface)] text-[var(--success)]'
                        : 'bg-[var(--warning-surface)] text-[var(--warning)]'
                    }`}
                  >
                    {isComplete ? 'Ready' : 'Needs review'}
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
            </div>
          </div>
          <Button
            type="button"
            variant={isOpen ? 'secondary' : 'ghost'}
            className="min-h-9 shrink-0 px-3 text-sm"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={contentId}
          >
            {isOpen ? 'Collapse' : 'Open'}
          </Button>
        </div>
      </CardHeader>
      {isOpen ? (
        <>
          <Separator />
          <CardContent id={contentId} className="grid gap-5 p-5">
            {children}
          </CardContent>
        </>
      ) : null}
    </Card>
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
  const [openSections, setOpenSections] = useState<Record<EditorSection, boolean>>({
    basics: true,
    content: true,
    seo: false,
    pricing: true,
    taxonomy: false,
    publish: false
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
  const openSectionCount = editorSections.filter((section) => openSections[section.id]).length;
  const readinessItems = [
    { label: 'Vietnamese copy', ready: viReady },
    { label: 'English copy', ready: enReady },
    { label: 'Vietnam offer', ready: vnOfferReady },
    { label: 'International offer', ready: intlOfferReady }
  ];
  const readyItemCount = readinessItems.filter((item) => item.ready).length;

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

  function toggleSection(section: EditorSection) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  }

  function saveDraft() {
    startTransition(async () => {
      const actionResult = await saveProductDraftAction(draft);
      setResult(actionResult);
      if (actionResult.status === 'saved') {
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
      return;
    }
    startTransition(async () => {
      const actionResult = await publishProductAction(productId);
      setResult(actionResult);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-6"
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

      <Card className="sticky top-4 z-20 border-[var(--accent)]/20 bg-[var(--surface)]/95 p-3 shadow-[0_18px_50px_rgba(92,48,26,0.10)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
              <span>{productId ? 'Saved draft' : 'New draft'}</span>
              <span aria-hidden="true">/</span>
              <span>{draft.productType === 'pdf_pattern' ? 'PDF pattern' : 'Handmade item'}</span>
              <span aria-hidden="true">/</span>
              <span>
                {readyItemCount} of {readinessItems.length} checks ready
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              Product editor workspace
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" disabled={isPending} className="sm:min-w-32">
              Save draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !productId}
              onClick={publishProduct}
              className="sm:min-w-36"
            >
              Publish product
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          <SmartSection
            id="basics"
            index={1}
            title="Product basics"
            description="Type and draft state"
            isComplete={Boolean(draft.productType)}
            isOpen={openSections.basics}
            onToggle={() => toggleSection('basics')}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="block space-y-2">
                <Label>Product type</Label>
                <Select
                  value={draft.productType}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      productType: value as ProductType
                    }))
                  }
                >
                  <SelectTrigger>
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
          </SmartSection>

          <SmartSection
            id="content"
            index={2}
            title="Content"
            description="Vietnamese and English copy"
            isComplete={viReady && enReady}
            isOpen={openSections.content}
            onToggle={() => toggleSection('content')}
          >
            {(['vi', 'en'] as const).map((locale) => {
              const label = locale === 'vi' ? 'Vietnamese' : 'English';
              const translation = draft.translations[locale];
              return (
                <div
                  key={locale}
                  id={`${locale}-content`}
                  className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="mb-4">
                    <h3 className="text-base font-semibold">{label} content</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Product-facing copy and specification notes for this locale.
                    </p>
                  </div>
                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="font-semibold">{label} title</span>
                      <Input
                        value={translation.title}
                        onChange={(event) => updateTranslation(locale, 'title', event.target.value)}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-semibold">{label} description</span>
                      <Textarea
                        className="min-h-28"
                        value={translation.description}
                        onChange={(event) =>
                          updateTranslation(locale, 'description', event.target.value)
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-semibold">{label} specifications JSON</span>
                      <Textarea
                        className="min-h-20 font-mono text-sm"
                        value={String(translation.specifications)}
                        onChange={(event) =>
                          updateTranslation(locale, 'specifications', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </SmartSection>

          <SmartSection
            id="seo"
            index={3}
            title="SEO"
            description="Slugs and search snippets"
            isComplete={viReady && enReady}
            isOpen={openSections.seo}
            onToggle={() => toggleSection('seo')}
          >
            {(['vi', 'en'] as const).map((locale) => {
              const label = locale === 'vi' ? 'Vietnamese' : 'English';
              const translation = draft.translations[locale];
              return (
                <div
                  key={`${locale}-seo`}
                  id={`${locale}-seo`}
                  className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="mb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-base font-semibold">{label} SEO</h3>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Keep storefront URLs and search snippets ready without repeating copy by
                          hand.
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
                          Title to SEO
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 text-xs"
                          onClick={() => summarizeDescriptionToSeo(locale)}
                        >
                          Summary to SEO
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="font-semibold">{label} slug</span>
                      <Input
                        value={translation.slug}
                        onChange={(event) => updateTranslation(locale, 'slug', event.target.value)}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-semibold">{label} SEO title</span>
                      <Input
                        value={translation.seoTitle}
                        onChange={(event) =>
                          updateTranslation(locale, 'seoTitle', event.target.value)
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="font-semibold">{label} SEO description</span>
                      <Textarea
                        className="min-h-20"
                        value={translation.seoDescription}
                        onChange={(event) =>
                          updateTranslation(locale, 'seoDescription', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </SmartSection>

          <SmartSection
            id="taxonomy"
            index={4}
            title="Taxonomy and collections"
            description="Search, select, and order catalog grouping"
            isOpen={openSections.taxonomy}
            onToggle={() => toggleSection('taxonomy')}
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
          </SmartSection>

          <SmartSection
            id="offers"
            index={5}
            title="Market offers"
            description="Availability and pricing by market"
            isComplete={vnOfferReady || intlOfferReady}
            isOpen={openSections.pricing}
            onToggle={() => toggleSection('pricing')}
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
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={draft.offers[market.key].enabled}
                      onChange={(event) => updateOffer(market.key, 'enabled', event.target.checked)}
                    />
                    Enabled
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Price</span>
                    <Input
                      type="number"
                      min="0"
                      className="min-h-10"
                      value={draft.offers[market.key].priceMinor ?? ''}
                      onChange={(event) =>
                        updateOffer(market.key, 'priceMinor', numberOrNull(event.target.value))
                      }
                    />
                  </label>
                  <span
                    className={`rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold ${readinessTone(market.ready)}`}
                  >
                    {market.ready ? 'Ready' : 'Needs price'}
                  </span>
                </div>
              ))}
            </div>
          </SmartSection>

          <SmartSection
            id="publish"
            index={6}
            title="Publish checklist"
            description="Readiness and next workflows"
            isComplete={viReady && enReady && (vnOfferReady || intlOfferReady)}
            isOpen={openSections.publish}
            onToggle={() => toggleSection('publish')}
          >
            <div className="grid gap-3 text-sm">
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
            </div>
          </SmartSection>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="overflow-hidden p-0">
            <div className="bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Control panel</p>
              <CardTitle className="mt-1 text-lg">
                {productId ? 'Draft in progress' : 'New catalog item'}
              </CardTitle>
            </div>
            <CardContent className="grid gap-5 p-5">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-[var(--radius-control)] bg-[var(--background)] p-3">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)]">Checks</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {readyItemCount}/{readinessItems.length}
                  </p>
                </div>
                <div className="rounded-[var(--radius-control)] bg-[var(--background)] p-3">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)]">Open</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {openSectionCount}/{editorSections.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <p className="font-semibold">Readiness</p>
                {readinessItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--background)] px-3 py-2"
                  >
                    <span className="text-[var(--muted-foreground)]">{item.label}</span>
                    <span
                      className={`size-2.5 rounded-full ${
                        item.ready ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                      }`}
                      aria-label={item.ready ? 'Ready' : 'Needs review'}
                    />
                  </div>
                ))}
              </div>

              {blockedIssues.length ? (
                <div className="rounded-[var(--radius-control)] bg-[var(--warning-surface)] p-3">
                  <p className="font-semibold text-[var(--warning)]">Publish blockers</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
                    {blockedIssues.slice(0, 6).map((issue, index) => (
                      <li key={`${issue.code}-${issue.locale ?? 'all'}-${index}`}>
                        {blockerLabel(issue.code, issue.locale)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Separator />

              <div className="grid gap-2">
                <p className="text-sm font-semibold">Workflows</p>
                {productId ? (
                  <>
                    <Link
                      className="inline-flex min-h-10 items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/media`}
                    >
                      Media and private PDF
                      <span aria-hidden="true">-&gt;</span>
                    </Link>
                    <Link
                      className="inline-flex min-h-10 items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      href={`/admin/catalog/${productId}/variants`}
                    >
                      Variants and inventory
                      <span aria-hidden="true">-&gt;</span>
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Save once to unlock media, PDF, variants, and inventory.
                  </p>
                )}
              </div>

              <Separator />

              <div className="grid gap-2">
                <p className="text-sm font-semibold">Sections</p>
                {editorSections.map((section, index) => (
                  <Button
                    key={section.id}
                    type="button"
                    variant={openSections[section.id] ? 'secondary' : 'ghost'}
                    onClick={() => toggleSection(section.id)}
                    className="min-h-10 justify-start gap-3 px-3 text-left text-sm"
                    aria-expanded={openSections[section.id]}
                  >
                    <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{section.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
