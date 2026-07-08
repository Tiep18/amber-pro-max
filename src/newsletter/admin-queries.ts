import 'server-only';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';

type NewsletterStatus = 'subscribed' | 'unsubscribed';
type NewsletterLocale = 'en' | 'vi';
type NewsletterMarket = 'intl' | 'vn';

export type AdminNewsletterFilters = {
  status?: NewsletterStatus | 'all';
  locale?: NewsletterLocale | 'all';
  market?: NewsletterMarket | 'all';
  search?: string;
};

export type AdminNewsletterSubscriber = {
  email: string;
  status: NewsletterStatus;
  latestLocale: NewsletterLocale;
  latestMarket: NewsletterMarket;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  updatedAt: string | null;
  latestConsent: {
    eventType: string;
    source: string;
    occurredAt: string | null;
    hasIpEvidence: boolean;
    hasUserAgentEvidence: boolean;
  } | null;
};

export type AdminNewsletterResult =
  | {status: 'success'; subscribers: AdminNewsletterSubscriber[]; filters: Required<AdminNewsletterFilters>}
  | {status: 'error'; code: 'admin_newsletter_lookup_failed'; filters: Required<AdminNewsletterFilters>};

type QueryResult<T> = Promise<{data: T[] | null; error: unknown}>;

type SubscriberQuery = {
  eq: (column: string, value: string) => SubscriberQuery;
  ilike: (column: string, value: string) => SubscriberQuery;
  order: (column: string, options: {ascending: boolean}) => SubscriberQuery;
  limit: (count: number) => QueryResult<NewsletterSubscriberRow>;
};

type ConsentQuery = {
  in: (column: string, values: string[]) => ConsentQuery;
  order: (column: string, options: {ascending: boolean}) => ConsentQuery;
  limit: (count: number) => QueryResult<NewsletterConsentRow>;
};

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => SubscriberQuery | ConsentQuery;
  };
};

type RequireAdmin = () => Promise<unknown>;

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type NewsletterSubscriberRow = {
  normalized_email: string;
  status: string;
  latest_locale: string;
  latest_market: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  updated_at: string | null;
};

type NewsletterConsentRow = {
  normalized_email: string;
  event_type: string;
  consent_source: string;
  occurred_at: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
};

function normalizeFilters(filters: AdminNewsletterFilters | undefined): Required<AdminNewsletterFilters> {
  return {
    status: filters?.status === 'subscribed' || filters?.status === 'unsubscribed' ? filters.status : 'all',
    locale: filters?.locale === 'en' || filters?.locale === 'vi' ? filters.locale : 'all',
    market: filters?.market === 'vn' || filters?.market === 'intl' ? filters.market : 'all',
    search: typeof filters?.search === 'string' ? filters.search.trim().slice(0, 120) : ''
  };
}

function asStatus(value: string): NewsletterStatus {
  return value === 'unsubscribed' ? 'unsubscribed' : 'subscribed';
}

function asLocale(value: string): NewsletterLocale {
  return value === 'vi' ? 'vi' : 'en';
}

function asMarket(value: string): NewsletterMarket {
  return value === 'vn' ? 'vn' : 'intl';
}

function latestConsentByEmail(rows: NewsletterConsentRow[]) {
  const latest = new Map<string, AdminNewsletterSubscriber['latestConsent']>();
  for (const row of rows) {
    if (latest.has(row.normalized_email)) {
      continue;
    }
    latest.set(row.normalized_email, {
      eventType: row.event_type,
      source: row.consent_source,
      occurredAt: row.occurred_at,
      hasIpEvidence: Boolean(row.ip_hash),
      hasUserAgentEvidence: Boolean(row.user_agent_hash)
    });
  }
  return latest;
}

export async function getAdminNewsletterSubscribers({
  client,
  requireAdmin,
  filters,
  recordOperationalFailure
}: {
  client: QueryClient;
  requireAdmin: RequireAdmin;
  filters?: AdminNewsletterFilters;
  recordOperationalFailure?: OperationalFailureRecorder;
}): Promise<AdminNewsletterResult> {
  await requireAdmin();
  const normalized = normalizeFilters(filters);

  let query = client
    .from('newsletter_subscribers')
    .select('normalized_email,status,latest_locale,latest_market,subscribed_at,unsubscribed_at,updated_at') as SubscriberQuery;

  if (normalized.status !== 'all') {
    query = query.eq('status', normalized.status);
  }
  if (normalized.locale !== 'all') {
    query = query.eq('latest_locale', normalized.locale);
  }
  if (normalized.market !== 'all') {
    query = query.eq('latest_market', normalized.market);
  }
  if (normalized.search) {
    query = query.ilike('normalized_email', `%${normalized.search}%`);
  }

  const subscriberResult = await query.order('updated_at', {ascending: false}).limit(100);
  if (subscriberResult.error) {
    await recordOperationalFailure?.({
      area: 'admin',
      severity: 'error',
      errorCode: 'admin_newsletter_lookup_failed',
      summary: 'Admin newsletter subscriber lookup failed',
      facts: {
        action: 'admin_newsletter_subscribers',
        status: normalized.status,
        market: normalized.market,
        code: 'admin_newsletter_lookup_failed'
      }
    });
    return {status: 'error', code: 'admin_newsletter_lookup_failed', filters: normalized};
  }

  const rows = subscriberResult.data ?? [];
  const emails = rows.map((row) => row.normalized_email);
  let consentByEmail = new Map<string, AdminNewsletterSubscriber['latestConsent']>();

  if (emails.length > 0) {
    const consentQuery = client
      .from('newsletter_consent_events')
      .select('normalized_email,event_type,consent_source,occurred_at,ip_hash,user_agent_hash') as ConsentQuery;
    const consentResult = await consentQuery.in('normalized_email', emails).order('occurred_at', {ascending: false}).limit(300);
    if (consentResult.error) {
      await recordOperationalFailure?.({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_newsletter_lookup_failed',
        summary: 'Admin newsletter consent lookup failed',
        facts: {
          action: 'admin_newsletter_consents',
          status: normalized.status,
          market: normalized.market,
          code: 'admin_newsletter_lookup_failed'
        }
      });
      return {status: 'error', code: 'admin_newsletter_lookup_failed', filters: normalized};
    }
    consentByEmail = latestConsentByEmail(consentResult.data ?? []);
  }

  return {
    status: 'success',
    filters: normalized,
    subscribers: rows.map((row) => ({
      email: row.normalized_email,
      status: asStatus(row.status),
      latestLocale: asLocale(row.latest_locale),
      latestMarket: asMarket(row.latest_market),
      subscribedAt: row.subscribed_at,
      unsubscribedAt: row.unsubscribed_at,
      updatedAt: row.updated_at,
      latestConsent: consentByEmail.get(row.normalized_email) ?? null
    }))
  };
}

export async function createAdminNewsletterQueryClient(): Promise<QueryClient> {
  return createSupabaseAdminClient() as unknown as QueryClient;
}
