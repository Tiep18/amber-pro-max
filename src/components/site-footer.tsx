import {getTranslations} from 'next-intl/server';
import {Suspense} from 'react';
import {type Locale} from '@/i18n/routing';
import {LocaleSwitcher} from './locale-switcher';

export async function SiteFooter({locale}: {locale: Locale}) {
  const t = await getTranslations('footer');

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-[var(--muted-foreground)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10 xl:px-12">
        <p>{t('copyright')}</p>
        <Suspense fallback={null}>
          <LocaleSwitcher locale={locale} />
        </Suspense>
      </div>
    </footer>
  );
}
