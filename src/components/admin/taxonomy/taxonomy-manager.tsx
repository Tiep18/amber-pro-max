import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteTaxonomyTermAction, saveTaxonomyTermAction } from '@/admin/taxonomy-actions';
import type {
  TaxonomySectionConfig,
  TaxonomyTerm,
  TaxonomyTextField
} from '@/admin/taxonomy-admin';
import { AdminEmptyState, AdminMetricCard, AdminStatusPill } from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SectionWithTerms = {
  config: TaxonomySectionConfig;
  terms: TaxonomyTerm[];
};

const fieldLabels: Record<TaxonomyTextField, string> = {
  name: 'Name',
  slug: 'Slug',
  description: 'Description',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description'
};

function fieldPlaceholder(field: TaxonomyTextField, locale: 'vi' | 'en') {
  if (field === 'slug') {
    return locale === 'vi' ? 'gau-bong-len' : 'crochet-toys';
  }
  if (field === 'description') {
    return locale === 'vi' ? 'Mo ta ngan bang tieng Viet' : 'Short English description';
  }
  return locale === 'vi'
    ? `${fieldLabels[field]} tieng Viet`
    : `English ${fieldLabels[field].toLowerCase()}`;
}

function inputName(locale: 'vi' | 'en', field: TaxonomyTextField) {
  return `${locale}.${field}`;
}

function FieldInput({
  locale,
  field,
  value
}: {
  locale: 'vi' | 'en';
  field: TaxonomyTextField;
  value?: string;
}) {
  const name = inputName(locale, field);
  const label = `${fieldLabels[field]} (${locale.toUpperCase()})`;
  const common =
    'min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-normal';

  if (field === 'description' || field === 'seoDescription') {
    return (
      <label className="grid gap-1 text-sm font-semibold">
        {label}
        <textarea
          name={name}
          defaultValue={value ?? ''}
          placeholder={fieldPlaceholder(field, locale)}
          className={common}
          rows={3}
        />
      </label>
    );
  }

  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        defaultValue={value ?? ''}
        placeholder={fieldPlaceholder(field, locale)}
        className={common}
      />
    </label>
  );
}

function TermForm({
  config,
  term,
  mode
}: {
  config: TaxonomySectionConfig;
  term?: TaxonomyTerm;
  mode: 'create' | 'edit';
}) {
  return (
    <form
      action={saveTaxonomyTermAction}
      className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4"
    >
      <input type="hidden" name="section" value={config.key} />
      {term ? <input type="hidden" name="termId" value={term.id} /> : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {mode === 'create' ? `Create ${config.title.toLowerCase()}` : 'Edit item'}
          </p>
          {term ? <p className="text-xs text-[var(--muted-foreground)]">{term.id}</p> : null}
        </div>
        <AdminStatusPill>{mode === 'create' ? 'New' : 'Existing'}</AdminStatusPill>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['vi', 'en'] as const).map((locale) => (
          <div key={locale} className="grid content-start gap-3">
            <p className="text-sm font-semibold uppercase text-[var(--accent)]">
              {locale === 'vi' ? 'Vietnamese' : 'English'}
            </p>
            {config.fields.map((field) => (
              <FieldInput
                key={`${locale}.${field}`}
                locale={locale}
                field={field}
                value={term?.translations[locale][field]}
              />
            ))}
          </div>
        ))}
      </div>
      <Button type="submit" className="w-fit gap-2">
        {mode === 'create' ? (
          <Plus className="size-4" aria-hidden="true" />
        ) : (
          <Pencil className="size-4" aria-hidden="true" />
        )}
        {mode === 'create' ? 'Create item' : 'Save changes'}
      </Button>
    </form>
  );
}

function DeleteTermForm({ config, term }: { config: TaxonomySectionConfig; term: TaxonomyTerm }) {
  const label =
    term.translations.en.name || term.translations.vi.name || term.translations.en.slug || term.id;

  return (
    <form
      action={deleteTaxonomyTermAction}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <input type="hidden" name="section" value={config.key} />
      <input type="hidden" name="termId" value={term.id} />
      <div>
        <p className="font-semibold">Delete {label}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Only allowed when this item is not used by products, blog posts, discounts, or
          collections.
        </p>
      </div>
      <Button type="submit" variant="destructive" className="w-fit gap-2">
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </Button>
    </form>
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
  const totalTerms = sections.reduce((total, section) => total + section.terms.length, 0);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Groups" value={sections.length} description="taxonomy sections" />
        <AdminMetricCard label="Items" value={totalTerms} description="managed records" />
        <AdminMetricCard label="Locales" value="2" description="Vietnamese and English" />
      </section>

      {saved ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-surface)] p-4 text-sm font-semibold text-[var(--success)]">
          Taxonomy saved.
        </p>
      ) : null}
      {deleted ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--success)] bg-[var(--success-surface)] p-4 text-sm font-semibold text-[var(--success)]">
          Taxonomy item deleted.
        </p>
      ) : null}
      {blocked ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-surface)] p-4 text-sm font-semibold text-[var(--warning)]">
          This taxonomy item is still in use, so it was not deleted.
        </p>
      ) : null}
      {invalid ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-surface)] p-4 text-sm font-semibold text-[var(--warning)]">
          Check required names and slug format.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--destructive)] bg-[var(--destructive-surface)] p-4 text-sm font-semibold text-[var(--destructive)]">
          Taxonomy could not be saved.
        </p>
      ) : null}

      {sections.map(({ config, terms }) => (
        <Card key={config.key} className="overflow-hidden p-0">
          <CardHeader className="m-0 border-b border-[var(--border)] p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-[var(--accent)]" aria-hidden="true" />
                  <CardTitle>{config.title}</CardTitle>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{config.description}</p>
              </div>
              <AdminStatusPill>{terms.length} items</AdminStatusPill>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            <TermForm config={config} mode="create" />
            {terms.length === 0 ? (
              <AdminEmptyState
                title="No taxonomy items yet."
                description="Create the first item above."
              />
            ) : (
              <div className="grid gap-4">
                {terms.map((term) => (
                  <div key={term.id} className="grid gap-3">
                    <TermForm config={config} term={term} mode="edit" />
                    <DeleteTermForm config={config} term={term} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
