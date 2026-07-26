import {getTranslations, setRequestLocale} from 'next-intl/server';
import {UnsubscribeResult} from '@/components/newsletter/unsubscribe-result';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {unsubscribeNewsletter} from '@/newsletter/consent';

type Params = Promise<{locale: Locale}>;
type SearchParams = Promise<{token?: string | string[]}>;

export default async function NewsletterUnsubscribePage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const tokenValue = (await searchParams).token;
  const client = await createSupabaseServerClient();
  const [result, t] = await Promise.all([
    unsubscribeNewsletter({rawToken: typeof tokenValue === 'string' ? tokenValue : null}, client as never),
    getTranslations({locale, namespace: 'newsletterUnsubscribe'})
  ]);

  return (
    <UnsubscribeResult
      result={result}
      subscribeAgainHref={`/${locale}#newsletter`}
      labels={{
        unsubscribedTitle: t('unsubscribedTitle'),
        unsubscribedBody: t('unsubscribedBody'),
        unavailableTitle: t('unavailableTitle'),
        unavailableBody: t('unavailableBody'),
        invalidTitle: t('invalidTitle'),
        invalidBody: t('invalidBody'),
        errorTitle: t('errorTitle'),
        errorBody: t('errorBody'),
        subscribeAgain: t('subscribeAgain')
      }}
    />
  );
}
