import {getTranslations, setRequestLocale} from 'next-intl/server';
import {requireUser} from '@/auth/guards';
import {AccountOrderHistory} from '@/components/fulfillment/account-order-history';
import {getCustomerOrderHistory} from '@/fulfillment/account-queries';
import {getAccountOrdersPath, type Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function renderAccountOrdersPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const user = await requireUser({locale, next: getAccountOrdersPath(locale)});
  const t = await getTranslations({locale, namespace: 'accountPurchases.orders'});
  const client = await createSupabaseServerClient();
  const result = await getCustomerOrderHistory({userId: user.id, client: client as never});

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      {result.status === 'success' ? (
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
            open: t('open')
          }}
        />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">{t('error')}</p>
      )}
    </main>
  );
}
