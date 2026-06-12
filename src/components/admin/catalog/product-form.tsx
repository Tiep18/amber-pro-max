'use client';

import {useMemo, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {
  publishProductAction,
  saveProductDraftAction,
  type PublishProductResult,
  type SaveProductDraftResult
} from '@/catalog/actions';
import type {ProductDraftInput} from '@/catalog/schemas';
import type {CatalogLocale, ProductType} from '@/catalog/types';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

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
      vi: {...emptyTranslation},
      en: {...emptyTranslation}
    },
    categoryIds: [],
    techniqueIds: [],
    tagIds: [],
    collections: [],
    offers: {
      vn: {enabled: false, priceMinor: null},
      intl: {enabled: false, priceMinor: null}
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

export function ProductForm({initialProduct, initialNotice, categories, techniques, tags, collections}: ProductFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraftInput>(initialProduct ?? defaultDraft());
  const [result, setResult] = useState<SaveProductDraftResult | PublishProductResult | null>(
    initialNotice === 'saved' && initialProduct?.productId ? {status: 'saved', productId: initialProduct.productId} : null
  );
  const [isPending, startTransition] = useTransition();
  const productId = draft.productId;

  const selectedCollections = useMemo(
    () => new Map(draft.collections.map((collection) => [collection.collectionId, collection.displayOrder])),
    [draft.collections]
  );

  function updateTranslation(locale: CatalogLocale, field: keyof ProductDraftInput['translations']['en'], value: string) {
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

  function updateIdList(field: 'categoryIds' | 'techniqueIds' | 'tagIds', id: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      [field]: checked ? [...current[field], id] : current[field].filter((value) => value !== id)
    }));
  }

  function updateCollection(id: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      collections: checked
        ? [...current.collections, {collectionId: id, displayOrder: 0}]
        : current.collections.filter((collection) => collection.collectionId !== id)
    }));
  }

  function updateCollectionOrder(id: string, displayOrder: number) {
    setDraft((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.collectionId === id ? {...collection, displayOrder} : collection
      )
    }));
  }

  function updateOffer(market: 'vn' | 'intl', field: 'enabled' | 'priceMinor', value: boolean | number | null) {
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

  function saveDraft() {
    startTransition(async () => {
      const actionResult = await saveProductDraftAction(draft);
      setResult(actionResult);
      if (actionResult.status === 'saved') {
        if (!draft.productId) {
          setDraft((current) => ({...current, productId: actionResult.productId}));
          window.location.assign(`/admin/catalog/${actionResult.productId}?saved=1`);
        } else {
          router.refresh();
        }
      }
    });
  }

  function publishProduct() {
    if (!productId) {
      setResult({status: 'invalid', issues: [{path: 'productId', code: 'save_before_publish'}]});
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
      {result?.status === 'invalid' ? <Alert variant="destructive">Check the highlighted catalog fields.</Alert> : null}
      {result?.status === 'error' ? <Alert variant="destructive">The catalog action could not be completed.</Alert> : null}
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

      <Card>
        <CardHeader>
          <CardTitle>Product basics</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block space-y-2">
            <span className="font-semibold">Product type</span>
            <select
              className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3"
              value={draft.productType}
              onChange={(event) => setDraft((current) => ({...current, productType: event.target.value as ProductType}))}
            >
              <option value="pdf_pattern">PDF pattern</option>
              <option value="physical_finished">Physical finished good</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {(['vi', 'en'] as const).map((locale) => {
        const label = locale === 'vi' ? 'Vietnamese' : 'English';
        const translation = draft.translations[locale];
        return (
          <Card key={locale}>
            <CardHeader>
              <CardTitle>{label} content</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="space-y-2">
                <span className="font-semibold">{label} title</span>
                <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={translation.title} onChange={(event) => updateTranslation(locale, 'title', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">{label} description</span>
                <textarea className="min-h-28 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2" value={translation.description} onChange={(event) => updateTranslation(locale, 'description', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">{label} specifications JSON</span>
                <textarea className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-mono text-sm" value={String(translation.specifications)} onChange={(event) => updateTranslation(locale, 'specifications', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">{label} slug</span>
                <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={translation.slug} onChange={(event) => updateTranslation(locale, 'slug', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">{label} SEO title</span>
                <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={translation.seoTitle} onChange={(event) => updateTranslation(locale, 'seoTitle', event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">{label} SEO description</span>
                <textarea className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2" value={translation.seoDescription} onChange={(event) => updateTranslation(locale, 'seoDescription', event.target.value)} />
              </label>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Taxonomy and collections</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Categories</legend>
            {categories.map((option) => (
              <label key={option.id} className="flex items-center gap-2">
                <input type="checkbox" checked={draft.categoryIds.includes(option.id)} onChange={(event) => updateIdList('categoryIds', option.id, event.target.checked)} />
                {option.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Techniques</legend>
            {techniques.map((option) => (
              <label key={option.id} className="flex items-center gap-2">
                <input type="checkbox" checked={draft.techniqueIds.includes(option.id)} onChange={(event) => updateIdList('techniqueIds', option.id, event.target.checked)} />
                {option.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Tags</legend>
            {tags.map((option) => (
              <label key={option.id} className="flex items-center gap-2">
                <input type="checkbox" checked={draft.tagIds.includes(option.id)} onChange={(event) => updateIdList('tagIds', option.id, event.target.checked)} />
                {option.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Collections</legend>
            {collections.map((option) => (
              <div key={option.id} className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3 sm:grid-cols-[1fr_160px]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedCollections.has(option.id)} onChange={(event) => updateCollection(option.id, event.target.checked)} />
                  {option.label}
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">{option.label} display order</span>
                  <input type="number" min="0" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={selectedCollections.get(option.id) ?? 0} onChange={(event) => updateCollectionOrder(option.id, Number(event.target.value))} disabled={!selectedCollections.has(option.id)} />
                </label>
              </div>
            ))}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market offers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
            <legend className="px-1 font-semibold">Vietnam</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.offers.vn.enabled} onChange={(event) => updateOffer('vn', 'enabled', event.target.checked)} />
              Vietnam market enabled
            </label>
            <label className="space-y-2">
              <span className="font-semibold">Vietnam price in VND</span>
              <input type="number" min="0" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={draft.offers.vn.priceMinor ?? ''} onChange={(event) => updateOffer('vn', 'priceMinor', numberOrNull(event.target.value))} />
            </label>
          </fieldset>
          <fieldset className="space-y-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
            <legend className="px-1 font-semibold">International</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.offers.intl.enabled} onChange={(event) => updateOffer('intl', 'enabled', event.target.checked)} />
              International market enabled
            </label>
            <label className="space-y-2">
              <span className="font-semibold">International price in USD cents</span>
              <input type="number" min="0" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" value={draft.offers.intl.priceMinor ?? ''} onChange={(event) => updateOffer('intl', 'priceMinor', numberOrNull(event.target.value))} />
            </label>
          </fieldset>
        </CardContent>
      </Card>

      {productId ? (
        <Card>
          <CardHeader>
            <CardTitle>Specialized workflows</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 font-semibold" href={`/admin/catalog/${productId}/media`}>
              Manage media and PDF
            </a>
            <a className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 font-semibold" href={`/admin/catalog/${productId}/variants`}>
              Manage variants and inventory
            </a>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          Save draft
        </Button>
        <Button type="button" variant="secondary" disabled={isPending || !productId} onClick={publishProduct}>
          Publish product
        </Button>
      </div>
    </form>
  );
}
