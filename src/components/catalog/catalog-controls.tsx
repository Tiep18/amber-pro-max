import {getTranslations} from 'next-intl/server';
import type {CatalogListState} from '@/catalog/list-state';

export async function CatalogControls({
  state
}: {
  state: CatalogListState;
}) {
  const t = await getTranslations('catalog');

  return (
    <form method="get" className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      {state.productType ? <input type="hidden" name="type" value={state.productType} /> : null}
      {state.categorySlug ? <input type="hidden" name="category" value={state.categorySlug} /> : null}
      <label className="grid gap-1 text-sm font-semibold">
        {t('search')}
        <input
          type="search"
          name="search"
          defaultValue={state.search}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        {t('sort')}
        <select
          name="sort"
          defaultValue={state.sort}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
        >
          <option value="newest">{t('newest')}</option>
          <option value="price_asc">{t('priceAsc')}</option>
          <option value="price_desc">{t('priceDesc')}</option>
          <option value="title">{t('titleSort')}</option>
        </select>
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        {t('apply')}
      </button>
    </form>
  );
}
