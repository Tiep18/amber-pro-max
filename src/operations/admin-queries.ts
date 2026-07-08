import 'server-only';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {sanitizeOperationalErrorFacts, type OperationalErrorArea, type OperationalErrorSeverity, type SafeOperationalFact} from './redaction';

type OperationalErrorStatus = 'unresolved' | 'resolved';

export type AdminOperationalErrorFilters = {
  status?: OperationalErrorStatus | 'all';
  area?: OperationalErrorArea | 'all';
};

export type AdminOperationalError = {
  id: string;
  area: OperationalErrorArea;
  severity: OperationalErrorSeverity;
  status: OperationalErrorStatus;
  errorCode: string;
  summary: string;
  sanitizedFacts: Record<string, SafeOperationalFact>;
  occurrenceCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  resolvedAt: string | null;
};

export type AdminOperationalErrorsResult =
  | {status: 'success'; errors: AdminOperationalError[]; filters: Required<AdminOperationalErrorFilters>}
  | {status: 'error'; code: 'admin_operational_errors_lookup_failed'; filters: Required<AdminOperationalErrorFilters>};

type OperationalErrorRow = {
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

type ErrorQuery = {
  eq: (column: string, value: string) => ErrorQuery;
  order: (column: string, options: {ascending: boolean}) => ErrorQuery;
  limit: (count: number) => Promise<{data: OperationalErrorRow[] | null; error: unknown}>;
};

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => ErrorQuery;
  };
};

type RequireAdmin = () => Promise<unknown>;

function normalizeFilters(filters: AdminOperationalErrorFilters | undefined): Required<AdminOperationalErrorFilters> {
  return {
    status: filters?.status === 'resolved' || filters?.status === 'all' ? filters.status : 'unresolved',
    area:
      filters?.area === 'application' ||
      filters?.area === 'storefront' ||
      filters?.area === 'payment' ||
      filters?.area === 'email' ||
      filters?.area === 'fulfillment' ||
      filters?.area === 'checkout' ||
      filters?.area === 'admin' ||
      filters?.area === 'all'
        ? filters.area
        : 'all'
  };
}

function asArea(value: string): OperationalErrorArea {
  return value === 'storefront' ||
    value === 'payment' ||
    value === 'email' ||
    value === 'fulfillment' ||
    value === 'checkout' ||
    value === 'admin'
    ? value
    : 'application';
}

function asSeverity(value: string): OperationalErrorSeverity {
  return value === 'warning' || value === 'critical' ? value : 'error';
}

function asStatus(value: string): OperationalErrorStatus {
  return value === 'resolved' ? 'resolved' : 'unresolved';
}

export async function getAdminOperationalErrors({
  client,
  requireAdmin,
  filters
}: {
  client: QueryClient;
  requireAdmin: RequireAdmin;
  filters?: AdminOperationalErrorFilters;
}): Promise<AdminOperationalErrorsResult> {
  await requireAdmin();
  const normalized = normalizeFilters(filters);

  let query = client
    .from('operational_errors')
    .select('id,area,severity,status,error_code,summary,sanitized_facts,occurrence_count,first_seen_at,last_seen_at,resolved_at') as ErrorQuery;

  if (normalized.status !== 'all') {
    query = query.eq('status', normalized.status);
  }
  if (normalized.area !== 'all') {
    query = query.eq('area', normalized.area);
  }

  const result = await query.order('last_seen_at', {ascending: false}).limit(100);
  if (result.error) {
    return {status: 'error', code: 'admin_operational_errors_lookup_failed', filters: normalized};
  }

  return {
    status: 'success',
    filters: normalized,
    errors: (result.data ?? []).map((row) => ({
      id: row.id,
      area: asArea(row.area),
      severity: asSeverity(row.severity),
      status: asStatus(row.status),
      errorCode: row.error_code,
      summary: row.summary,
      sanitizedFacts: sanitizeOperationalErrorFacts(row.sanitized_facts),
      occurrenceCount: row.occurrence_count,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      resolvedAt: row.resolved_at
    }))
  };
}

export async function createAdminOperationalErrorsQueryClient(): Promise<QueryClient> {
  return createSupabaseAdminClient() as unknown as QueryClient;
}
