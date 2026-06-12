import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {AuthTextLink} from '@/components/auth/auth-page';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {signOutAction} from '@/auth/actions';
import {requireUser} from '@/auth/guards';
import {getLocalizedPath, type Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';

export async function renderAccountOverview({params, expectedLocale}: {params: Promise<{locale: Locale}>; expectedLocale: Locale}) {
  const {locale} = await params;
  if (locale !== expectedLocale) {
    notFound();
  }

  setRequestLocale(locale);
  const user = await requireUser({locale, next: getLocalizedPath('/account', locale)});
  const t = await getTranslations('account');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">{locale.toUpperCase()}</p>
          <CardTitle>{t('title')}</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">{t('intro')}</p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-base">
            <div>
              <dt className="font-semibold">{t('email')}</dt>
              <dd className="text-[var(--muted-foreground)]">{user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold">{t('locale')}</dt>
              <dd className="text-[var(--muted-foreground)]">{locale.toUpperCase()}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <AuthTextLink href={getLocalizedPath('/reset-password', locale)}>{t('passwordLink')}</AuthTextLink>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="secondary">
                {t('signOut')}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
