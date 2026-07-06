import {getTranslations} from 'next-intl/server';
import type {CatalogListState} from '@/catalog/list-state';
import { CatalogControlsClient } from '@/components/catalog/catalog-controls-client';

export async function CatalogControls({
  state
}: {
  state: CatalogListState;
}) {
  const t = await getTranslations('catalog');

  return (
    <CatalogControlsClient
      state={state}
      labels={{
        search: t('search'),
        searchPlaceholder: t('searchPlaceholder'),
        searchSubmit: t('searchSubmit'),
        sort: t('sort'),
        newest: t('newest'),
        priceAsc: t('priceAsc'),
        priceDesc: t('priceDesc'),
        titleSort: t('titleSort')
      }}
    />
  );
}
