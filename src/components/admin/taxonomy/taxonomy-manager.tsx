'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  AlertCircle,
  Check,
  ChevronRight,
  FolderTree,
  Languages,
  Link2,
  ListChecks,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { deleteTaxonomyTermAction, saveTaxonomyTermAction } from '@/admin/taxonomy-actions';
import type {
  TaxonomySectionConfig,
  TaxonomyTerm,
  TaxonomyTextField
} from '@/admin/taxonomy-admin';
import { AdminStatusPill } from '@/components/admin/admin-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Locale = 'vi' | 'en';
type SectionWithTerms = { config: TaxonomySectionConfig; terms: TaxonomyTerm[] };

const fieldLabels: Record<TaxonomyTextField, string> = {
  name: 'Name',
  slug: 'Slug',
  description: 'Description',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description'
};

const sourceLabels: Record<string, string> = {
  product_categories: 'products',
  discount_code_categories: 'discounts',
  product_tags: 'products',
  product_techniques: 'products',
  collection_products: 'products',
  discount_code_collections: 'discounts',
  blog_posts: 'posts',
  blog_post_tags: 'posts'
};

function termLabel(term: TaxonomyTerm) {
  return (
    term.translations.en.name ||
    term.translations.vi.name ||
    term.translations.en.slug ||
    term.translations.vi.slug ||
    'Untitled item'
  );
}

function isLocaleReady(config: TaxonomySectionConfig, term: TaxonomyTerm, locale: Locale) {
  const translation = term.translations[locale];
  return Boolean(
    translation.name?.trim() && (!config.fields.includes('slug') || translation.slug?.trim())
  );
}

function isTermReady(config: TaxonomySectionConfig, term: TaxonomyTerm) {
  return isLocaleReady(config, term, 'vi') && isLocaleReady(config, term, 'en');
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : mode === 'create' ? (
        <Plus className="size-4" aria-hidden="true" />
      ) : (
        <Pencil className="size-4" aria-hidden="true" />
      )}
      {pending ? 'Saving...' : mode === 'create' ? 'Create item' : 'Save changes'}
    </Button>
  );
}

function FieldInput({
  locale,
  field,
  value,
  error,
  onClearError
}: {
  locale: Locale;
  field: TaxonomyTextField;
  value?: string;
  error?: string;
  onClearError: () => void;
}) {
  const id = `taxonomy-${locale}-${field}`;
  const required = field === 'name' || field === 'slug';
  const helpId = `${id}-help`;
  const shared = {
    id,
    name: `${locale}.${field}`,
    defaultValue: value ?? '',
    maxLength: field === 'name' ? 160 : field === 'slug' ? 200 : undefined,
    'aria-describedby': error ? `${id}-error ${helpId}` : helpId,
    'aria-invalid': Boolean(error),
    onChange: onClearError,
    className: error ? 'border-[var(--destructive)] ring-1 ring-[var(--destructive)]' : undefined
  };

  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="flex items-center justify-between gap-3 text-sm font-semibold">
        {fieldLabels[field]}
        {required ? <span className="text-xs text-[var(--muted-foreground)]">Required</span> : null}
      </span>
      {field === 'description' || field === 'seoDescription' ? (
        <Textarea {...shared} rows={field === 'seoDescription' ? 3 : 5} />
      ) : (
        <Input
          {...shared}
          pattern={field === 'slug' ? '[a-z0-9]+(?:-[a-z0-9]+)*' : undefined}
          placeholder={
            field === 'slug' ? (locale === 'vi' ? 'gau-bong-len' : 'crochet-toys') : undefined
          }
        />
      )}
      <span id={helpId} className="text-xs leading-5 text-[var(--muted-foreground)]">
        {field === 'slug'
          ? 'Lowercase letters, numbers, and single hyphens only.'
          : field === 'seoTitle'
            ? 'Optional title used in search results.'
            : field === 'seoDescription'
              ? 'Optional search snippet for this language.'
              : required
                ? `Enter the ${locale === 'vi' ? 'Vietnamese' : 'English'} value.`
                : `Optional ${locale === 'vi' ? 'Vietnamese' : 'English'} content.`}
      </span>
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

function UsageSummary({ term }: { term: TaxonomyTerm }) {
  const sources = Object.entries(term.usageBySource).filter(([, count]) => count > 0);
  if (!sources.length) {
    return <p className="text-sm text-[var(--muted-foreground)]">Not used anywhere yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map(([source, count]) => (
        <span
          key={source}
          className="rounded-[var(--radius-control)] bg-[var(--warning-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--warning)]"
        >
          {count} {sourceLabels[source] ?? source.replaceAll('_', ' ')}
        </span>
      ))}
    </div>
  );
}

function TermEditor({
  config,
  term,
  mode
}: {
  config: TaxonomySectionConfig;
  term?: TaxonomyTerm;
  mode: 'create' | 'edit';
}) {
  const [locale, setLocale] = useState<Locale>('vi');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inUse = Boolean(term?.usageCount);

  const validate = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};
    for (const item of ['vi', 'en'] as const) {
      const name = String(formData.get(`${item}.name`) ?? '').trim();
      if (!name) errors[`${item}.name`] = 'Name is required.';
      else if (name.length > 160) errors[`${item}.name`] = 'Name must be 160 characters or fewer.';

      if (config.fields.includes('slug')) {
        const slug = String(formData.get(`${item}.slug`) ?? '').trim();
        if (!slug) errors[`${item}.slug`] = 'Slug is required.';
        else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          errors[`${item}.slug`] = 'Use lowercase letters, numbers, and single hyphens only.';
        } else if (slug.length > 200)
          errors[`${item}.slug`] = 'Slug must be 200 characters or fewer.';
      }
    }
    if (Object.keys(errors).length) {
      event.preventDefault();
      setFieldErrors(errors);
      setLocale(Object.keys(errors)[0].startsWith('en.') ? 'en' : 'vi');
    }
  };

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/45 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">
              {mode === 'create' ? `New ${config.title.toLowerCase()}` : config.title}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold">
              {term ? termLabel(term) : 'Create taxonomy item'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              {config.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <AdminStatusPill tone="default">
              {mode === 'create' ? 'New' : `${term?.usageCount ?? 0} uses`}
            </AdminStatusPill>
            {term ? (
              <AdminStatusPill tone={isTermReady(config, term) ? 'success' : 'warning'}>
                {isTermReady(config, term) ? 'Ready' : 'Needs content'}
              </AdminStatusPill>
            ) : null}
          </div>
        </div>
      </div>

      <form action={saveTaxonomyTermAction} noValidate onSubmit={validate}>
        <input type="hidden" name="section" value={config.key} />
        {term ? <input type="hidden" name="termId" value={term.id} /> : null}
        <div className="grid gap-5 p-5 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
          <div
            className="grid w-full grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1"
            role="tablist"
            aria-label="Translation language"
          >
            {(['vi', 'en'] as const).map((item) => {
              const ready = term ? isLocaleReady(config, term, item) : false;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={locale === item}
                  onClick={() => setLocale(item)}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-3px)] px-3 text-sm font-semibold transition-colors',
                    locale === item
                      ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  <Languages className="size-4" aria-hidden="true" />
                  {item === 'vi' ? 'Vietnamese' : 'English'}
                  {term ? (
                    <span className={ready ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                      {ready ? (
                        <Check className="size-3.5" />
                      ) : (
                        <AlertCircle className="size-3.5" />
                      )}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {(['vi', 'en'] as const).map((panelLocale) => (
            <div
              key={panelLocale}
              role="tabpanel"
              hidden={locale !== panelLocale}
              className={cn('grid gap-4', locale !== panelLocale && 'hidden')}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="font-semibold">
                    {panelLocale === 'vi' ? 'Vietnamese content' : 'English content'}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {term && isLocaleReady(config, term, panelLocale)
                      ? 'Required fields are complete.'
                      : 'Complete the required fields for this locale.'}
                  </p>
                </div>
              </div>
              {config.fields.map((field) => (
                <FieldInput
                  key={`${term?.id ?? 'new'}-${panelLocale}-${field}`}
                  locale={panelLocale}
                  field={field}
                  value={term?.translations[panelLocale][field]}
                  error={fieldErrors[`${panelLocale}.${field}`]}
                  onClearError={() =>
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next[`${panelLocale}.${field}`];
                      return next;
                    })
                  }
                />
              ))}
            </div>
          ))}

          {term ? (
            <section
              className="grid gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-4"
              aria-labelledby="usage-heading"
            >
              <div>
                <h3 id="usage-heading" className="font-semibold">
                  Usage and deletion
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {inUse
                    ? 'Remove these relationships before deleting this item.'
                    : 'This item has no relationships and can be deleted.'}
                </p>
              </div>
              <UsageSummary term={term} />
            </section>
          ) : null}
        </div>

        <div className="hidden min-h-[76px] items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/25 px-6 py-4 lg:flex">
          {term ? (
            <Button
              type="submit"
              form={`delete-${term.id}`}
              variant="destructive"
              disabled={inUse}
              className="gap-2"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete item
            </Button>
          ) : (
            <span />
          )}
          <SubmitButton mode={mode} />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl justify-end gap-2">
            {term ? (
              <Button
                type="submit"
                form={`delete-${term.id}`}
                variant="destructive"
                disabled={inUse}
                className="w-11 px-0"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span className="sr-only">Delete item</span>
              </Button>
            ) : null}
            <SubmitButton mode={mode} />
          </div>
        </div>
      </form>

      {term ? (
        <form
          id={`delete-${term.id}`}
          action={deleteTaxonomyTermAction}
          onSubmit={(event) => {
            if (!window.confirm(`Delete ${termLabel(term)}? This cannot be undone.`))
              event.preventDefault();
          }}
        >
          <input type="hidden" name="section" value={config.key} />
          <input type="hidden" name="termId" value={term.id} />
        </form>
      ) : null}
    </section>
  );
}

function TaxonomyBrowser({
  sections,
  activeSectionKey,
  activeTermId,
  creating,
  onSelectSection,
  onSelectTerm,
  onCreate
}: {
  sections: SectionWithTerms[];
  activeSectionKey: string;
  activeTermId?: string;
  creating: boolean;
  onSelectSection: (key: string) => void;
  onSelectTerm: (id: string) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const activeSection =
    sections.find(({ config }) => config.key === activeSectionKey) ?? sections[0];
  const filteredTerms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return activeSection?.terms ?? [];
    return (activeSection?.terms ?? []).filter((term) =>
      [
        termLabel(term),
        term.translations.vi.name,
        term.translations.vi.slug,
        term.translations.en.slug
      ]
        .filter(Boolean)
        .some((item) => item?.toLowerCase().includes(normalized))
    );
  }, [activeSection, query]);

  if (!activeSection) return null;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] p-3">
        {sections.map(({ config, terms }) => (
          <button
            key={config.key}
            type="button"
            onClick={() => {
              onSelectSection(config.key);
              setQuery('');
            }}
            className={cn(
              'flex min-h-10 items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 text-left text-sm font-semibold transition-colors',
              config.key === activeSection.config.key
                ? 'bg-[var(--accent)] text-white'
                : 'hover:bg-[var(--surface-muted)]'
            )}
          >
            <span className="truncate">{config.title.replace('Product ', '')}</span>
            <span className="text-xs tabular-nums opacity-75">{terms.length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 border-b border-[var(--border)] p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${activeSection.config.title.toLowerCase()}`}
            aria-label={`Search ${activeSection.config.title}`}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={onCreate} className="w-full gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New item
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {creating ? (
          <div className="mb-3 rounded-[var(--radius-control)] bg-[var(--accent-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--accent)]">
            Creating a new item
          </div>
        ) : null}
        {filteredTerms.length ? (
          <div className="grid gap-1.5">
            {filteredTerms.map((term) => {
              const selected = !creating && activeTermId === term.id;
              const ready = isTermReady(activeSection.config, term);
              return (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => onSelectTerm(term.id)}
                  className={cn(
                    'grid min-h-[68px] grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--radius-control)] border border-transparent px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-[var(--border)] bg-[var(--surface-muted)] shadow-[inset_3px_0_0_var(--accent)]'
                      : 'hover:bg-[var(--surface-muted)]/70'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{termLabel(term)}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span className={ready ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                        {ready ? 'Ready' : 'Needs content'}
                      </span>
                      <span aria-hidden="true">/</span>
                      <span>{term.usageCount} uses</span>
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-3 py-10 text-center">
            <p className="font-semibold">{query ? 'No matching items' : 'No items yet'}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {query ? 'Try another name or slug.' : 'Create the first item in this section.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaxonomyManager({
  sections,
  saved,
  deleted,
  blocked,
  invalid,
  error
}: {
  sections: SectionWithTerms[];
  saved?: boolean;
  deleted?: boolean;
  blocked?: boolean;
  invalid?: boolean;
  error?: boolean;
}) {
  const firstSection = sections[0];
  const [activeSectionKey, setActiveSectionKey] = useState(firstSection?.config.key ?? '');
  const [activeTermId, setActiveTermId] = useState<string | undefined>(firstSection?.terms[0]?.id);
  const [creating, setCreating] = useState(!firstSection?.terms.length);
  const [mobileBrowserOpen, setMobileBrowserOpen] = useState(false);
  const activeSection =
    sections.find(({ config }) => config.key === activeSectionKey) ?? firstSection;
  const activeTerm = activeSection?.terms.find((term) => term.id === activeTermId);
  const totalTerms = sections.reduce((total, section) => total + section.terms.length, 0);
  const totalUsage = sections.reduce(
    (total, section) => total + section.terms.reduce((sum, term) => sum + term.usageCount, 0),
    0
  );
  const readyTerms = sections.reduce(
    (total, section) =>
      total + section.terms.filter((term) => isTermReady(section.config, term)).length,
    0
  );

  const selectSection = (key: string) => {
    const section = sections.find(({ config }) => config.key === key);
    setActiveSectionKey(key);
    setActiveTermId(section?.terms[0]?.id);
    setCreating(!section?.terms.length);
  };
  const selectTerm = (id: string) => {
    setActiveTermId(id);
    setCreating(false);
    setMobileBrowserOpen(false);
  };
  const startCreate = () => {
    setActiveTermId(undefined);
    setCreating(true);
    setMobileBrowserOpen(false);
  };

  const notice = saved
    ? { tone: 'success', text: 'Taxonomy item saved.' }
    : deleted
      ? { tone: 'success', text: 'Taxonomy item deleted.' }
      : blocked
        ? { tone: 'warning', text: 'This item is still in use. Review its usage before deleting.' }
        : invalid
          ? { tone: 'warning', text: 'Some required values are missing or a slug is invalid.' }
          : error
            ? { tone: 'error', text: 'Taxonomy could not be saved. Try again.' }
            : null;

  if (!activeSection) return null;

  const browserProps = {
    sections,
    activeSectionKey: activeSection.config.key,
    activeTermId,
    creating,
    onSelectSection: selectSection,
    onSelectTerm: selectTerm,
    onCreate: startCreate
  };

  return (
    <div className="grid gap-4 pb-20 lg:pb-0">
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {[
          {
            label: 'Items',
            value: totalTerms,
            description: `${readyTerms} content-ready`,
            icon: ListChecks
          },
          {
            label: 'Groups',
            value: sections.length,
            description: 'taxonomy sections',
            icon: FolderTree
          },
          {
            label: 'Usage links',
            value: totalUsage,
            description: 'products, posts, discounts',
            icon: Link2
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[116px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4 sm:px-6',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>

      {notice ? (
        <div
          role="status"
          className={cn(
            'flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm font-semibold',
            notice.tone === 'success' &&
              'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]',
            notice.tone === 'warning' &&
              'border-[var(--warning)] bg-[var(--warning-surface)] text-[var(--warning)]',
            notice.tone === 'error' &&
              'border-[var(--destructive)] bg-[var(--destructive-surface)] text-[var(--destructive)]'
          )}
        >
          {notice.tone === 'success' ? (
            <Check className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          {notice.text}
        </div>
      ) : null}

      <div className="flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Current group</p>
          <p className="truncate font-semibold">{activeSection.config.title}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMobileBrowserOpen(true)}
          className="gap-2"
        >
          <ListTree className="size-4" aria-hidden="true" /> Browse
        </Button>
        <Sheet
          open={mobileBrowserOpen}
          onOpenChange={setMobileBrowserOpen}
          showTrigger={false}
          triggerLabel="Browse taxonomy"
          title="Taxonomy items"
          side="left"
          bodyClassName="p-0"
        >
          <TaxonomyBrowser {...browserProps} />
        </Sheet>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_304px]">
        <main className="min-w-0">
          <TermEditor
            key={`${activeSection.config.key}-${creating ? 'new' : activeTerm?.id}`}
            config={activeSection.config}
            term={creating ? undefined : activeTerm}
            mode={creating ? 'create' : 'edit'}
          />
        </main>
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)] lg:block">
          <TaxonomyBrowser {...browserProps} />
        </aside>
      </div>
    </div>
  );
}
