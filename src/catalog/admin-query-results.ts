import {runMonitoredThrowingQuery} from '@/operations/monitoring';

type QueryResult = {
  error: unknown;
};

type CatalogAdminQueryContext = {
  action: string;
  productId?: string;
};

export class CatalogAdminLoadError extends Error {
  constructor() {
    super('Catalog admin data could not be loaded.');
    this.name = 'CatalogAdminLoadError';
  }
}

export async function assertCatalogAdminQueryResults(
  results: QueryResult[],
  context: CatalogAdminQueryContext
) {
  const failedResult = results.find((result) => Boolean(result.error));
  if (!failedResult) return;

  await runMonitoredThrowingQuery({
    area: 'admin',
    action: context.action,
    errorCode: 'catalog_admin_load_failed',
    summary: 'Catalog admin data load failed',
    facts: context.productId ? {productId: context.productId} : undefined,
    query: async () => {
      throw failedResult.error;
    },
    publicError: new CatalogAdminLoadError()
  });
}
