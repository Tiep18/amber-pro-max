import {getTranslations, setRequestLocale} from 'next-intl/server';
import {requireUser} from '@/auth/guards';
import {PatternLibrary} from '@/components/fulfillment/pattern-library';
import {getCustomerPatternLibrary} from '@/fulfillment/account-queries';
import {getAccountPatternsPath, type Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function renderPatternLibraryPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const user = await requireUser({locale, next: getAccountPatternsPath(locale)});
  const t = await getTranslations({locale, namespace: 'accountPurchases.patterns'});
  const client = await createSupabaseServerClient();
  const result = await getCustomerPatternLibrary({userId: user.id, locale, client: client as never});

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      {result.status === 'success' ? (
        <PatternLibrary
          patterns={result.patterns}
          labels={{
            title: t('title'),
            empty: t('empty'),
            purchases: t('purchases'),
            latest: t('latest'),
            download: t('download'),
            inactive: t('inactive')
          }}
        />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">{t('error')}</p>
      )}
    </main>
  );
}
