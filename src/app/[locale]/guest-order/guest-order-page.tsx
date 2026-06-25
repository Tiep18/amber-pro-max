import {getTranslations, setRequestLocale} from 'next-intl/server';
import {GuestReopenForm} from '@/components/fulfillment/guest-reopen-form';
import type {Locale} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function renderGuestOrderPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations({locale, namespace: 'guestAccess'});

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
      <GuestReopenForm
        locale={locale}
        labels={{
          title: t('reopen.title'),
          intro: t('reopen.intro'),
          orderNumber: t('fields.orderNumber'),
          email: t('fields.email'),
          reopenSubmit: t('reopen.submit'),
          claimSubmit: t('claimEmail.submit'),
          genericSuccess: t('genericSuccess')
        }}
      />
    </main>
  );
}
