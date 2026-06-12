import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {getEquivalentLocalizedPath, type Locale} from '@/i18n/routing';

export default async function SignInPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  if (locale !== 'en') {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <main>
      <h1>{t('signInTitle')}</h1>
      <a href={getEquivalentLocalizedPath('/en/sign-in', 'vi')}>Vietnamese</a>
    </main>
  );
}
