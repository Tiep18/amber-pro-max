import {getTranslations} from 'next-intl/server';
import type {CatalogListState} from '@/catalog/list-state';

export async function CatalogControls({
  state
}: {
  state: CatalogListState;
}) {
  const t = await getTranslations('catalog');

  return (
    <form method="get" className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)] items-end gap-2 sm:grid-cols-[1fr_220px_auto] sm:gap-3">
      {state.productType ? <input type="hidden" name="type" value={state.productType} /> : null}
      {state.categorySlug ? <input type="hidden" name="category" value={state.categorySlug} /> : null}
      <label className="grid gap-1 text-sm font-semibold">
        {t('search')}
        <input
          type="search"
          name="search"
          autoComplete="off"
          spellCheck={false}
          defaultValue={state.search}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        {t('sort')}
        <select
          name="sort"
          defaultValue={state.sort}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal text-[var(--foreground)]"
        >
          <option value="newest">{t('newest')}</option>
          <option value="price_asc">{t('priceAsc')}</option>
          <option value="price_desc">{t('priceDesc')}</option>
          <option value="title">{t('titleSort')}</option>
        </select>
      </label>
      <button
        type="submit"
        className="col-span-2 min-h-11 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white hover:bg-[var(--accent-hover)] sm:col-span-1"
      >
        {t('apply')}
      </button>
    </form>
  );
}
