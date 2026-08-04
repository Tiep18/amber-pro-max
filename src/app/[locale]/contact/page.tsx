import Link from 'next/link';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {getCatalogPath, getGuestOrderPath, type Locale} from '@/i18n/routing';
import {getPublicSupportConfig} from '@/support/config';

export default async function ContactPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const [t, orders, navigation] = await Promise.all([
    getTranslations({locale, namespace: 'support.contact'}),
    getTranslations({locale, namespace: 'orders.accessDenied'}),
    getTranslations({locale, namespace: 'navigation'})
  ]);
  const config = getPublicSupportConfig();
  const emailLabel = config.emailHref?.slice('mailto:'.length) ?? null;

  return (
    <main className="container !max-w-[720px] !px-3 py-8 sm:!px-6 lg:py-12">
      <div className="grid gap-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-paper)] p-4 sm:p-6">
        <header className="grid gap-2">
          <h1 className="text-[28px] font-semibold leading-tight">{t('heading')}</h1>
          <p className="max-w-[68ch] leading-6 text-[var(--muted-foreground)]">{t('body')}</p>
          <p className="max-w-[68ch] text-sm leading-6 text-[var(--destructive)]">
            {locale === 'vi'
              ? 'KhÃ´ng chia sáº» máº­t kháº©u, thÃ´ng tin Ä‘Äƒng nháº­p ngÃ¢n hÃ ng hoáº·c liÃªn káº¿t truy cáº­p Ä‘Æ¡n hÃ ng.'
              : 'Do not share passwords, bank credentials, or private order-access links.'}
          </p>
        </header>

        {config.hasChannels ? (
          <ul className="grid gap-3" aria-label={t('heading')}>
            {config.emailHref && emailLabel ? (
              <li className="grid gap-1">
                <span className="break-all text-sm text-[var(--muted-foreground)]">{emailLabel}</span>
                <a
                  href={config.emailHref}
                  className="inline-flex min-h-11 w-fit items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 font-semibold text-white"
                >
                  {t('email')}
                </a>
              </li>
            ) : null}
            {config.zaloHref ? (
              <li>
                <a
                  href={config.zaloHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t('zalo')}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 font-semibold"
                >
                  {t('zalo')}
                </a>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4 leading-6">
            {t('unavailable')}
          </p>
        )}

        <nav className="flex flex-wrap gap-3" aria-label={t('heading')}>
          <Link
            href={getCatalogPath(locale)}
            className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            {navigation('catalog')}
          </Link>
          <Link
            href={getGuestOrderPath(locale)}
            className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            {orders('recoverGuest')}
          </Link>
        </nav>
      </div>
    </main>
  );
}
