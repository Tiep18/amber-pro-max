'use client';

import Link from 'next/link';
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
  { id: 'content', label: 'Content', description: 'Vietnamese and English copy' },
  { id: 'seo', label: 'SEO', description: 'Slugs and search snippets' },
  { id: 'pricing', label: 'Pricing', description: 'Market offers and prices' },
  { id: 'taxonomy', label: 'Taxonomy', description: 'Categories, tags, collections' },
  { id: 'publish', label: 'Publish', description: 'Readiness and next workflows' }
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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm"
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          <div className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 sm:grid-cols-3 xl:grid-cols-6">
            {editorSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`rounded-[var(--radius-control)] px-3 py-2 text-left transition-colors ${
                  openSections[section.id]
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                }`}
                aria-expanded={openSections[section.id]}
              >
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="mt-0.5 block text-xs opacity-80">{section.description}</span>
              </button>
            ))}
          </div>

          {openSections.basics ? (
            <Card id="basics">
              <CardHeader>
                <CardTitle>Product basics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <label className="block space-y-2">
                  <span className="font-semibold">Product type</span>
                  <select
                    className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3"
                    value={draft.productType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        productType: event.target.value as ProductType
                      }))
                    }
                  >
                    <option value="pdf_pattern">PDF pattern</option>
                    <option value="physical_finished">Physical finished good</option>
                  </select>
                </label>
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-sm">
                  <p className="font-semibold">{productId ? 'Saved draft' : 'New draft'}</p>
                  <p className="mt-1 text-[var(--muted-foreground)]">
                    {initialProduct?.status
                      ? `Current status: ${initialProduct.status}`
                      : 'Save once to unlock media and inventory workflows.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {openSections.content
            ? (['vi', 'en'] as const).map((locale) => {
                const label = locale === 'vi' ? 'Vietnamese' : 'English';
                const translation = draft.translations[locale];
                return (
                  <Card key={locale} id={`${locale}-content`}>
                    <CardHeader>
                      <CardTitle>{label} content</CardTitle>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Product-facing copy and specification notes for this locale.
                      </p>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <label className="space-y-2">
                        <span className="font-semibold">{label} title</span>
                        <input
                          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                          value={translation.title}
                          onChange={(event) =>
                            updateTranslation(locale, 'title', event.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="font-semibold">{label} description</span>
                        <textarea
                          className="min-h-28 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
                          value={translation.description}
                          onChange={(event) =>
                            updateTranslation(locale, 'description', event.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="font-semibold">{label} specifications JSON</span>
                        <textarea
                          className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
                          value={String(translation.specifications)}
                          onChange={(event) =>
                            updateTranslation(locale, 'specifications', event.target.value)
                          }
                        />
                      </label>
                    </CardContent>
                  </Card>
                );
              })
            : null}

          {openSections.seo
            ? (['vi', 'en'] as const).map((locale) => {
                const label = locale === 'vi' ? 'Vietnamese' : 'English';
                const translation = draft.translations[locale];
                return (
                  <Card key={`${locale}-seo`} id={`${locale}-seo`}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <CardTitle>{label} SEO</CardTitle>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            Keep storefront URLs and search snippets ready without repeating copy by
                            hand.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => generateSlug(locale)}
                          >
                            Generate slug
                          </button>
                          <button
                            type="button"
                            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => copyTitleToSeo(locale)}
                          >
                            Title to SEO
                          </button>
                          <button
                            type="button"
                            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-xs font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => summarizeDescriptionToSeo(locale)}
                          >
                            Summary to SEO
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <label className="space-y-2">
                        <span className="font-semibold">{label} slug</span>
                        <input
                          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                          value={translation.slug}
                          onChange={(event) =>
                            updateTranslation(locale, 'slug', event.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="font-semibold">{label} SEO title</span>
                        <input
                          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                          value={translation.seoTitle}
                          onChange={(event) =>
                            updateTranslation(locale, 'seoTitle', event.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="font-semibold">{label} SEO description</span>
                        <textarea
                          className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
                          value={translation.seoDescription}
                          onChange={(event) =>
                            updateTranslation(locale, 'seoDescription', event.target.value)
                          }
                        />
                      </label>
                    </CardContent>
                  </Card>
                );
              })
            : null}

          {openSections.taxonomy ? (
            <Card id="taxonomy">
              <CardHeader>
                <CardTitle>Taxonomy and collections</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
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
                      const option = collections.find(
                        (item) => item.id === collection.collectionId
                      );
                      return (
                        <label
                          key={collection.collectionId}
                          className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3 sm:grid-cols-[1fr_160px] sm:items-center"
                        >
                          <span className="font-semibold">{option?.label ?? 'Collection'}</span>
                          <input
                            type="number"
                            min="0"
                            className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
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
              </CardContent>
            </Card>
          ) : null}

          {openSections.pricing ? (
            <Card id="offers">
              <CardHeader>
                <CardTitle>Market offers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
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
                        onChange={(event) =>
                          updateOffer(market.key, 'enabled', event.target.checked)
                        }
                      />
                      Enabled
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-semibold">Price</span>
                      <input
                        type="number"
                        min="0"
                        className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
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
              </CardContent>
            </Card>
          ) : null}

          {openSections.publish ? (
            <Card>
              <CardHeader>
                <CardTitle>Publish checklist</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
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
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Editor state</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted-foreground)]">Product</span>
                <span className="font-semibold">{productId ? 'Saved draft' : 'New draft'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted-foreground)]">Type</span>
                <span className="font-semibold">
                  {draft.productType === 'pdf_pattern' ? 'PDF pattern' : 'Handmade'}
                </span>
              </div>
              {initialProduct?.status ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Status</span>
                  <span className="font-semibold">{initialProduct.status}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button type="submit" disabled={isPending}>
                Save draft
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending || !productId}
                onClick={publishProduct}
              >
                Publish product
              </Button>
              {!productId ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Save once to unlock media, PDF, variants, and inventory.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Readiness</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
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
            </CardContent>
          </Card>

          {blockedIssues.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Publish blockers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
                  {blockedIssues.slice(0, 6).map((issue, index) => (
                    <li key={`${issue.code}-${issue.locale ?? 'all'}-${index}`}>
                      {blockerLabel(issue.code, issue.locale)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {productId ? (
                <>
                  <Link
                    className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/media`}
                  >
                    Media and private PDF
                  </Link>
                  <Link
                    className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    href={`/admin/catalog/${productId}/variants`}
                  >
                    Variants and inventory
                  </Link>
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Specialized workflows appear after the draft exists.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm font-semibold">
              {editorSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`rounded-[var(--radius-control)] px-3 py-2 text-left transition-colors ${
                    openSections[section.id]
                      ? 'bg-[var(--surface-muted)] text-[var(--accent)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                  }`}
                  aria-expanded={openSections[section.id]}
                >
                  {section.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
