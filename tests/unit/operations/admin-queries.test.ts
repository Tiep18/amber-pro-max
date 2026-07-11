import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAdminOperationalErrors } from '@/operations/admin-queries';

type OperationalErrorTestRow = {
  id: string;
  area: string;
  severity: string;
  status: string;
  error_code: string;
  summary: string;
  sanitized_facts: unknown;
  occurrence_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  resolved_at: string | null;
};

function queryBuilder(rows: OperationalErrorTestRow[], count = rows.length) {
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(async () => ({ data: rows, error: null, count }))
  };
  return builder;
}

describe('admin operational error queries', () => {
  it('keeps storefront area filter and rows distinct from generic application errors', async () => {
    const query = queryBuilder(
      [
        {
          id: 'error-1',
          area: 'storefront',
          severity: 'warning',
          status: 'unresolved',
          error_code: 'storefront.home.featured_products_failed',
          summary: 'Home featured products failed',
          sanitized_facts: { action: 'home_featured_products', locale: 'en' },
          occurrence_count: 1,
          first_seen_at: '2026-07-09T00:00:00.000Z',
          last_seen_at: '2026-07-09T00:00:00.000Z',
          resolved_at: null
        }
      ],
      21
    );
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => query)
      }))
    };

    await expect(
      getAdminOperationalErrors({
        client,
        requireAdmin: vi.fn(async () => ({ id: 'admin' })),
        filters: { status: 'unresolved', area: 'storefront', page: 2 }
      })
    ).resolves.toMatchObject({
      status: 'success',
      filters: { status: 'unresolved', area: 'storefront', page: 2 },
      pagination: { page: 2, pageSize: 20, totalCount: 21, totalPages: 2 },
      errors: [
        {
          area: 'storefront',
          errorCode: 'storefront.home.featured_products_failed',
          sanitizedFacts: { action: 'home_featured_products', locale: 'en' }
        }
      ]
    });

    expect(query.eq).toHaveBeenCalledWith('area', 'storefront');
    expect(query.range).toHaveBeenCalledWith(20, 39);
  });
});
