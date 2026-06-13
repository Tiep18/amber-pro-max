import {getTranslations} from 'next-intl/server';
import type {CatalogProductType, CatalogSort} from '@/catalog/queries';

export async function CatalogControls({
  search,
  productType,
  sort
}: {
  search?: string;
  productType?: CatalogProductType;
  sort: CatalogSort;
}) {
  const t = await getTranslations('catalog');

  return (
    <form method="get" className="grid gap-3 border-y border-[var(--border)] py-5 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
      <label className="grid gap-1 text-sm font-semibold">
        {t('search')}
        <input
          type="search"
          name="search"
          defaultValue={search}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        {t('productType')}
        <select
          name="type"
          defaultValue={productType ?? ''}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
        >
          <option value="">{t('allTypes')}</option>
          <option value="pdf_pattern">{t('pdfPattern')}</option>
          <option value="physical_finished">{t('finishedItem')}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        {t('sort')}
        <select
          name="sort"
          defaultValue={sort}
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
