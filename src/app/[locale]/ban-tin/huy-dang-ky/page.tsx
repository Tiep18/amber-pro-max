import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {UnsubscribeResult} from '@/components/newsletter/unsubscribe-result';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {unsubscribeNewsletter} from '@/newsletter/consent';

type Params = Promise<{locale: string}>;
type SearchParams = Promise<{token?: string | string[]}>;

export default async function VietnameseNewsletterUnsubscribePage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  if (locale !== 'vi') notFound();
  setRequestLocale('vi');
  const tokenValue = (await searchParams).token;
  const client = await createSupabaseServerClient();
  const [result, t] = await Promise.all([
    unsubscribeNewsletter({rawToken: typeof tokenValue === 'string' ? tokenValue : null}, client as never),
    getTranslations('newsletterUnsubscribe')
  ]);

  return (
    <UnsubscribeResult
      result={result}
      subscribeAgainHref="/vi#newsletter"
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
