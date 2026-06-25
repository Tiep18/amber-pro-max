import {getTranslations, setRequestLocale} from 'next-intl/server';
import {OrderClaimPanel} from '@/components/fulfillment/order-claim-panel';
import type {Locale} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function renderOrderClaimPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale; orderNumber: string}>;
  searchParams: Promise<{token?: string}>;
}) {
  const [{locale, orderNumber}, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations({locale, namespace: 'guestAccess'});

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <OrderClaimPanel
        locale={locale}
        orderNumber={decodeURIComponent(orderNumber)}
        token={query.token ?? ''}
        labels={{
          title: t('claim.title'),
          intro: t('claim.intro'),
          submit: t('claim.submit'),
          signedInOnly: t('claim.signedInOnly'),
          genericDenied: t('claim.genericDenied')
        }}
      />
    </main>
  );
}
