'use client';

import { type ChangeEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock3, Languages, Search, Send, Save, Settings2 } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  publishBlogPostAction,
  saveBlogPostDraftAction,
  scheduleBlogPostAction,
  unpublishBlogPostAction
} from '@/content/blog/actions';
import type { BlogPublishBlocker } from '@/content/blog/publish-checks';
import type { BlogLocale, BlogPostDraftInput } from '@/content/blog/schemas';
import { isBlogLocaleDraftReady, mapBlogValidationIssues } from './blog-form-validation';

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
  relatedProducts: Array<{ productId: string; displayOrder: number }>;
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

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} role="alert" className="text-xs font-semibold text-[var(--destructive)]">
      {message}
    </span>
  ) : null;
}

function TranslationField({
  label,
  path,
  value,
  error,
  multiline,
  rows,
  className,
  required,
  onChange
}: {
  label: string;
  path: string;
  value: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const shared = {
    id: path,
    value,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${path}-error` : undefined,
    className: cn(
      error && 'border-[var(--destructive)] ring-1 ring-[var(--destructive)]',
      className
    ),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value)
  };
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={path}>
      <span className="flex items-center justify-between gap-3">
        {label}
        {required ? (
          <span className="text-xs font-normal text-[var(--muted-foreground)]">Required</span>
        ) : null}
      </span>
      {multiline ? <Textarea {...shared} rows={rows} /> : <Input {...shared} />}
      <FieldError id={`${path}-error`} message={error} />
    </label>
  );
}

export function BlogPostForm({
  categories,
  tags,
  products,
  initialPost,
  initialNotice
}: BlogPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [postId, setPostId] = useState(initialPost?.postId);
  const [notice, setNotice] = useState<string | null>(
    initialNotice === 'saved' ? 'Draft saved' : null
  );
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<BlogPublishBlocker[]>([]);
  const [categoryId, setCategoryId] = useState(initialPost?.categoryId ?? '');
  const [publishedAt, setPublishedAt] = useState(toDateTimeInput(initialPost?.publishedAt));
  const [translations, setTranslations] = useState<Record<BlogLocale, TranslationFormState>>(
    initialPost?.translations ?? { vi: { ...emptyTranslation }, en: { ...emptyTranslation } }
  );
  const [tagIds, setTagIds] = useState(initialPost?.tagIds ?? []);
  const [relatedProducts, setRelatedProducts] = useState(initialPost?.relatedProducts ?? []);
  const [locale, setLocale] = useState<BlogLocale>('vi');
  const [tagQuery, setTagQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const filteredTags = useMemo(
    () => tags.filter((tag) => tag.label.toLowerCase().includes(tagQuery.trim().toLowerCase())),
    [tagQuery, tags]
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.label.toLowerCase().includes(productQuery.trim().toLowerCase())
      ),
    [productQuery, products]
  );
  const selectedTagIds = useMemo(() => new Set(tagIds), [tagIds]);
  const relatedProductById = useMemo(
    () => new Map(relatedProducts.map((product) => [product.productId, product])),
    [relatedProducts]
  );
  const localeReady = (item: BlogLocale) => isBlogLocaleDraftReady(translations[item]);

  function fieldPath(item: BlogLocale, key: keyof TranslationFormState) {
    return `translations.${item}.${key}`;
  }

  function clearFieldError(path: string) {
    setFieldErrors((current) => {
      if (!current[path]) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  }

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
    setTagIds((current) =>
      checked ? [...new Set([...current, tagId])] : current.filter((id) => id !== tagId)
    );
  }

  function toggleRelatedProduct(productId: string, checked: boolean) {
    setRelatedProducts((current) =>
      checked
        ? [...current, { productId, displayOrder: current.length }]
        : current.filter((product) => product.productId !== productId)
    );
  }

  function updateRelatedProductOrder(productId: string, displayOrder: string) {
    const parsed = Number.parseInt(displayOrder, 10);
    setRelatedProducts((current) =>
      current.map((product) =>
        product.productId === productId
          ? { ...product, displayOrder: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed }
          : product
      )
    );
  }

  function draftPayload(): BlogPostDraftInput {
    return {
      ...(postId ? { postId } : {}),
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
        setFieldErrors({});
        setPostId(result.postId);
        setNotice('Draft saved');
        if (!postId) {
          router.replace(`/admin/blog/${result.postId}?saved=1`);
        } else {
          router.refresh();
        }
        return;
      }
      if (result.status === 'invalid') {
        const mapped = mapBlogValidationIssues(result.issues);
        setFieldErrors(mapped.fields);
        if (mapped.firstLocale) setLocale(mapped.firstLocale);
        const firstMessage = mapped.firstPath ? mapped.fields[mapped.firstPath] : null;
        setError(
          firstMessage
            ? `Review the highlighted fields. First issue: ${firstMessage}`
            : 'Review the highlighted fields before saving the draft.'
        );
        if (mapped.firstPath) {
          requestAnimationFrame(() => document.getElementById(mapped.firstPath)?.focus());
        }
        return;
      }
      setError('Draft could not be saved.');
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
    <div className="grid gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="grid min-w-0 gap-4">
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

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
          <div
            className="grid grid-cols-2 gap-1 border-b border-[var(--border)] bg-[var(--surface-muted)]/45 p-1.5"
            role="tablist"
            aria-label="Post language"
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
                  locale === item
                    ? 'bg-[var(--surface)] shadow-sm'
                    : 'text-[var(--muted-foreground)]'
                )}
              >
                <Languages className="size-4" aria-hidden="true" />
                {item === 'vi' ? 'Vietnamese' : 'English'}
                <span
                  className={localeReady(item) ? 'text-[var(--success)]' : 'text-[var(--warning)]'}
                >
                  {localeReady(item) ? <Check className="size-3.5" aria-hidden="true" /> : '•'}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-5 p-5 sm:p-6">
            <div>
              <h2 className="font-semibold">
                {locale === 'vi' ? 'Vietnamese content' : 'English content'}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Write the localized article and its storefront search metadata.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['title', 'slug'] as const).map((key) => {
                const path = fieldPath(locale, key);
                return (
                  <TranslationField
                    key={key}
                    label={`${locale === 'vi' ? 'Vietnamese' : 'English'} ${key}`}
                    path={path}
                    value={translations[locale][key]}
                    error={fieldErrors[path]}
                    required
                    onChange={(value) => {
                      updateTranslation(locale, key, value);
                      clearFieldError(path);
                    }}
                  />
                );
              })}
            </div>
            {(['description', 'body'] as const).map((key) => {
              const path = fieldPath(locale, key);
              return (
                <TranslationField
                  key={key}
                  label={`${locale === 'vi' ? 'Vietnamese' : 'English'} ${key}`}
                  path={path}
                  value={translations[locale][key]}
                  error={fieldErrors[path]}
                  multiline
                  required
                  rows={key === 'description' ? 3 : undefined}
                  className={key === 'body' ? 'min-h-[320px] leading-7' : undefined}
                  onChange={(value) => {
                    updateTranslation(locale, key, value);
                    clearFieldError(path);
                  }}
                />
              );
            })}
            <section className="grid gap-4 border-t border-[var(--border)] pt-5">
              <div>
                <h3 className="font-semibold">Search and sharing</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Optional metadata for search results and social previews.
                </p>
              </div>
              {(['seoTitle', 'seoDescription'] as const).map((key) => {
                const path = fieldPath(locale, key);
                return (
                  <TranslationField
                    key={key}
                    label={`${locale === 'vi' ? 'Vietnamese' : 'English'} ${key === 'seoTitle' ? 'SEO title' : 'SEO description'}`}
                    path={path}
                    value={translations[locale][key]}
                    error={fieldErrors[path]}
                    multiline={key === 'seoDescription'}
                    rows={3}
                    onChange={(value) => {
                      updateTranslation(locale, key, value);
                      clearFieldError(path);
                    }}
                  />
                );
              })}
              <details className="rounded-[var(--radius-control)] border border-[var(--border)] p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Advanced social image storage
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(['socialImageBucket', 'socialImagePath'] as const).map((key) => {
                    const path = fieldPath(locale, key);
                    return (
                      <TranslationField
                        key={key}
                        label={`${locale === 'vi' ? 'Vietnamese' : 'English'} social image ${key === 'socialImageBucket' ? 'bucket' : 'path'}`}
                        path={path}
                        value={translations[locale][key]}
                        error={fieldErrors[path]}
                        onChange={(value) => {
                          updateTranslation(locale, key, value);
                          clearFieldError(path);
                        }}
                      />
                    );
                  })}
                </div>
              </details>
            </section>
          </div>
        </section>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-20">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Post settings</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-semibold">Category</span>
              <Select
                value={categoryId || 'none'}
                onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}
              >
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Publish date and time
              <Input
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">
            Tags{' '}
            <span className="text-xs font-normal text-[var(--muted-foreground)]">
              ({tagIds.length})
            </span>
          </h2>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={tagQuery}
              onChange={(event) => setTagQuery(event.target.value)}
              placeholder="Search tags"
              className="pl-9 text-sm"
            />
          </div>
          <div className="mt-3 grid max-h-48 gap-1 overflow-y-auto">
            {filteredTags.map((tag) => (
              <label
                key={tag.id}
                htmlFor={`blog-tag-${tag.id}`}
                className="flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                <Checkbox
                  id={`blog-tag-${tag.id}`}
                  checked={selectedTagIds.has(tag.id)}
                  onCheckedChange={(checked) => toggleTag(tag.id, checked === true)}
                />
                {tag.label}
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">
            Related products{' '}
            <span className="text-xs font-normal text-[var(--muted-foreground)]">
              ({relatedProducts.length})
            </span>
          </h2>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Search products"
              className="pl-9 text-sm"
            />
          </div>
          <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto">
            {filteredProducts.map((product) => {
              const relatedProduct = relatedProductById.get(product.id);
              return (
                <div key={product.id} className="grid grid-cols-[1fr_60px] items-center gap-2">
                  <label
                    htmlFor={`related-product-${product.id}`}
                    className="flex min-h-9 min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
                  >
                    <Checkbox
                      id={`related-product-${product.id}`}
                      checked={Boolean(relatedProduct)}
                      onCheckedChange={(checked) =>
                        toggleRelatedProduct(product.id, checked === true)
                      }
                    />
                    <span className="truncate">{product.label}</span>
                  </label>
                  <Input
                    aria-label={`${product.label} display order`}
                    type="number"
                    min="0"
                    value={relatedProduct?.displayOrder ?? 0}
                    onChange={(event) => updateRelatedProductOrder(product.id, event.target.value)}
                    disabled={!relatedProduct}
                    className="min-h-9 px-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur lg:left-[280px]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-end gap-2">
          <Button
            onClick={unpublish}
            variant="ghost"
            disabled={isPending || !postId}
            className="min-h-10 px-3 text-sm"
          >
            Unpublish
          </Button>
          <Button
            onClick={schedule}
            variant="secondary"
            disabled={isPending || !postId}
            className="min-h-10 gap-2 px-3 text-sm"
          >
            <Clock3 className="size-4" aria-hidden="true" />
            Schedule post
          </Button>
          <Button
            onClick={publishNow}
            variant="secondary"
            disabled={isPending || !postId}
            className="min-h-10 gap-2 px-3 text-sm"
          >
            <Send className="size-4" aria-hidden="true" />
            Publish post
          </Button>
          <Button onClick={saveDraft} disabled={isPending} className="min-h-10 gap-2 px-3 text-sm">
            <Save className="size-4" aria-hidden="true" />
            {isPending ? 'Saving...' : 'Save draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
