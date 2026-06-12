import {getTranslations, setRequestLocale} from 'next-intl/server';
import type {Locale} from '@/i18n/routing';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export default async function HomePage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:py-14 lg:px-10 xl:px-12">
      <section className="grid gap-5">
        <p className="text-sm font-semibold text-[var(--accent)]">{t('eyebrow')}</p>
        <h1 className="max-w-[680px] text-[28px] font-semibold leading-[1.2]">{t('title')}</h1>
        <p className="max-w-[680px] text-base text-[var(--muted-foreground)]">{t('intro')}</p>
      </section>
      <section aria-label={t('readinessLabel')} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('localizedTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--muted-foreground)]">{t('localizedBody')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('secureTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--muted-foreground)]">{t('secureBody')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('studioTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--muted-foreground)]">{t('studioBody')}</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
