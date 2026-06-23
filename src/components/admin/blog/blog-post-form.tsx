'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  publishBlogPostAction,
  saveBlogPostDraftAction,
  scheduleBlogPostAction,
  unpublishBlogPostAction
} from '@/content/blog/actions';
import type {BlogPublishBlocker} from '@/content/blog/publish-checks';
import type {BlogLocale, BlogPostDraftInput} from '@/content/blog/schemas';

export type BlogSelectOption = {
  id: string;
  label: string;
};

type TranslationFormState = {
  slug: string;
  title: string;
  description: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  socialImageBucket: string;
  socialImagePath: string;
};

export type BlogPostFormInitial = {
  postId: string;
  status: 'draft' | 'published' | 'archived';
  categoryId: string | null;
  publishedAt: string | null;
  translations: Record<BlogLocale, TranslationFormState>;
  tagIds: string[];
  relatedProducts: Array<{productId: string; displayOrder: number}>;
};

type BlogPostFormProps = {
  categories: BlogSelectOption[];
  tags: BlogSelectOption[];
  products: BlogSelectOption[];
  initialPost?: BlogPostFormInitial;
  initialNotice?: 'saved';
};

const emptyTranslation: TranslationFormState = {
  slug: '',
  title: '',
  description: '',
  body: '',
  seoTitle: '',
  seoDescription: '',
  socialImageBucket: '',
  socialImagePath: ''
};

const inputClass =
  'min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base';

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
}

function fromOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function blockerLabel(issue: BlogPublishBlocker) {
  const locale = issue.locale === 'vi' ? 'Vietnamese ' : issue.locale === 'en' ? 'English ' : '';
  const labels: Record<BlogPublishBlocker['code'], string> = {
    missing_category: 'Blog category',
    missing_translation: `${locale}translation`,
    missing_slug: `${locale}slug`,
    missing_title: `${locale}title`,
    missing_description: `${locale}description`,
    missing_social_image: `${locale}social image`,
    publish_requirement: 'Publish requirement'
  };
  return labels[issue.code];
}

export function BlogPostForm({categories, tags, products, initialPost, initialNotice}: BlogPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [postId, setPostId] = useState(initialPost?.postId);
  const [notice, setNotice] = useState<string | null>(initialNotice === 'saved' ? 'Draft saved' : null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<BlogPublishBlocker[]>([]);
  const [categoryId, setCategoryId] = useState(initialPost?.categoryId ?? '');
  const [publishedAt, setPublishedAt] = useState(toDateTimeInput(initialPost?.publishedAt));
  const [translations, setTranslations] = useState<Record<BlogLocale, TranslationFormState>>(
    initialPost?.translations ?? {vi: {...emptyTranslation}, en: {...emptyTranslation}}
  );
  const [tagIds, setTagIds] = useState(initialPost?.tagIds ?? []);
  const [relatedProducts, setRelatedProducts] = useState(initialPost?.relatedProducts ?? []);

  function updateTranslation(locale: BlogLocale, key: keyof TranslationFormState, value: string) {
    setTranslations((current) => ({
      ...current,
      [locale]: {
        ...current[locale],
        [key]: value
      }
    }));
  }

  function toggleTag(tagId: string, checked: boolean) {
    setTagIds((current) => (checked ? [...new Set([...current, tagId])] : current.filter((id) => id !== tagId)));
  }

  function toggleRelatedProduct(productId: string, checked: boolean) {
    setRelatedProducts((current) =>
      checked
        ? [...current, {productId, displayOrder: current.length}]
        : current.filter((product) => product.productId !== productId)
    );
  }

  function updateRelatedProductOrder(productId: string, displayOrder: string) {
    const parsed = Number.parseInt(displayOrder, 10);
    setRelatedProducts((current) =>
      current.map((product) =>
        product.productId === productId
          ? {...product, displayOrder: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed}
          : product
      )
    );
  }

  function draftPayload(): BlogPostDraftInput {
    return {
      ...(postId ? {postId} : {}),
      status: 'draft',
      categoryId: categoryId || null,
      publishedAt: null,
      translations: {
        vi: {
          ...translations.vi,
          socialImageBucket: fromOptionalText(translations.vi.socialImageBucket),
          socialImagePath: fromOptionalText(translations.vi.socialImagePath)
        },
        en: {
          ...translations.en,
          socialImageBucket: fromOptionalText(translations.en.socialImageBucket),
          socialImagePath: fromOptionalText(translations.en.socialImagePath)
        }
      },
      tagIds,
      relatedProducts
    };
  }

  function saveDraft() {
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await saveBlogPostDraftAction(draftPayload());
      if (result.status === 'saved') {
        setPostId(result.postId);
        setNotice('Draft saved');
        if (!postId) {
          router.replace(`/admin/blog/${result.postId}?saved=1`);
        } else {
          router.refresh();
        }
        return;
      }
      setError(result.status === 'invalid' ? 'Review the required blog fields.' : 'Draft could not be saved.');
    });
  }

  function publishNow() {
    if (!postId) {
      setError('Save the draft before publishing.');
      return;
    }
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await publishBlogPostAction(postId);
      if (result.status === 'published') {
        setNotice('Post published');
        router.refresh();
        return;
      }
      if (result.status === 'blocked') {
        setBlockers(result.issues);
        return;
      }
      setError('Post could not be published.');
    });
  }

  function schedule() {
    if (!postId) {
      setError('Save the draft before scheduling.');
      return;
    }
    if (!publishedAt) {
      setError('Choose a publish date and time.');
      return;
    }
    const scheduledAt = new Date(publishedAt).toISOString();
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await scheduleBlogPostAction(postId, scheduledAt);
      if (result.status === 'scheduled') {
        setNotice('Post scheduled');
        router.refresh();
        return;
      }
      if (result.status === 'blocked') {
        setBlockers(result.issues);
        return;
      }
      setError('Post could not be scheduled.');
    });
  }

  function unpublish() {
    if (!postId) {
      setError('Save the draft first.');
      return;
    }
    setNotice(null);
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      const result = await unpublishBlogPostAction(postId);
      if (result.status === 'unpublished') {
        setNotice('Post unpublished');
        router.refresh();
        return;
      }
      setError('Post could not be unpublished.');
    });
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Shared post settings</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="grid gap-2 font-semibold">
            Category
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            Publish date and time
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              className={inputClass}
            />
          </label>
        </CardContent>
      </Card>

      {(['vi', 'en'] as const).map((locale) => (
        <Card key={locale}>
          <CardHeader>
            <CardTitle>{locale === 'vi' ? 'Vietnamese content' : 'English content'}</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese title' : 'English title'}
              <input
                value={translations[locale].title}
                onChange={(event) => updateTranslation(locale, 'title', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese slug' : 'English slug'}
              <input
                value={translations[locale].slug}
                onChange={(event) => updateTranslation(locale, 'slug', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese description' : 'English description'}
              <textarea
                value={translations[locale].description}
                onChange={(event) => updateTranslation(locale, 'description', event.target.value)}
                className={inputClass}
                rows={3}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese body' : 'English body'}
              <textarea
                value={translations[locale].body}
                onChange={(event) => updateTranslation(locale, 'body', event.target.value)}
                className={inputClass}
                rows={8}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese SEO title' : 'English SEO title'}
              <input
                value={translations[locale].seoTitle}
                onChange={(event) => updateTranslation(locale, 'seoTitle', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {locale === 'vi' ? 'Vietnamese SEO description' : 'English SEO description'}
              <textarea
                value={translations[locale].seoDescription}
                onChange={(event) => updateTranslation(locale, 'seoDescription', event.target.value)}
                className={inputClass}
                rows={2}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 font-semibold">
                {locale === 'vi' ? 'Vietnamese social image bucket' : 'English social image bucket'}
                <input
                  value={translations[locale].socialImageBucket}
                  onChange={(event) => updateTranslation(locale, 'socialImageBucket', event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 font-semibold">
                {locale === 'vi' ? 'Vietnamese social image path' : 'English social image path'}
                <input
                  value={translations[locale].socialImagePath}
                  onChange={(event) => updateTranslation(locale, 'socialImagePath', event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Tags and related products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={tagIds.includes(tag.id)} onChange={(event) => toggleTag(tag.id, event.target.checked)} />
                {tag.label}
              </label>
            ))}
          </div>
          <div className="space-y-3">
            {products.map((product) => {
              const relatedProduct = relatedProducts.find((item) => item.productId === product.id);
              return (
                <div key={product.id} className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={Boolean(relatedProduct)}
                      onChange={(event) => toggleRelatedProduct(product.id, event.target.checked)}
                    />
                    {product.label}
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Display order
                    <input
                      aria-label={`${product.label} display order`}
                      type="number"
                      min="0"
                      value={relatedProduct?.displayOrder ?? 0}
                      onChange={(event) => updateRelatedProductOrder(product.id, event.target.value)}
                      className={inputClass}
                      disabled={!relatedProduct}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={saveDraft} disabled={isPending}>
          Save draft
        </Button>
        <Button onClick={publishNow} variant="secondary" disabled={isPending}>
          Publish post
        </Button>
        <Button onClick={schedule} variant="secondary" disabled={isPending}>
          Schedule post
        </Button>
        <Button onClick={unpublish} variant="ghost" disabled={isPending}>
          Unpublish
        </Button>
      </div>
    </div>
  );
}
