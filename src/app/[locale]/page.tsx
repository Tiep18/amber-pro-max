import {getTranslations, setRequestLocale} from 'next-intl/server';
import type {Locale} from '@/i18n/routing';

export default async function HomePage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main>
      <p>{t('eyebrow')}</p>
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>
    </main>
  );
}
