import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/auth/guards';
import { AccountOrderHistory } from '@/components/fulfillment/account-order-history';
import { getCustomerOrderHistory } from '@/fulfillment/account-queries';
import { getAccountOrdersPath, type Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function renderAccountOrdersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [user, t, client] = await Promise.all([
    requireUser({ locale, next: getAccountOrdersPath(locale) }),
    getTranslations({ locale, namespace: 'accountPurchases.orders' }),
    createSupabaseServerClient()
  ]);
  const result = await getCustomerOrderHistory({
    userId: user.id,
    client: client as never,
    authRole: user.authRole,
    authState: 'claims_present'
  });

  return result.status === 'success' ? (
    <AccountOrderHistory
      orders={result.orders}
      locale={locale}
      labels={{
        title: t('title'),
        empty: t('empty'),
        total: t('total'),
        payment: t('payment'),
        digital: t('digital'),
        physical: t('physical'),
        open: t('open'),
        tabAll: t('tabAll'),
        tabAwaitingPayment: t('tabAwaitingPayment'),
        tabInProgress: t('tabInProgress'),
        tabCompleted: t('tabCompleted'),
        searchPlaceholder: t('searchPlaceholder'),
        noFilteredOrders: t('noFilteredOrders'),
        clearFilters: t('clearFilters'),
        payNow: t('payNow'),
        viewDetails: t('viewDetails'),
        moreItems: t('moreItems', { count: '{count}' }),
        placedAt: t('placedAt', { date: '{date}' }),
        digitalReady: t('digitalReady'),
        digitalPending: t('digitalPending'),
        physicalShipping: t('physicalShipping'),
        physicalDelivered: t('physicalDelivered'),
        physicalPending: t('physicalPending')
      }}
    />
  ) : (
    <p
      role="alert"
      className="rounded-[var(--radius-card)] border border-[var(--destructive)]/20 bg-[var(--destructive-surface)] p-4 text-sm font-medium text-[var(--destructive)]"
    >
      {t('error')}
    </p>
  );
}
