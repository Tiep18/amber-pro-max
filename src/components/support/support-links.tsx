import Link from 'next/link';
import {createTranslator} from 'next-intl';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';

export type PublicSupportConfig = Readonly<{
  emailHref: string | null;
  zaloHref: string | null;
  hasChannels: boolean;
  storeTimeZone: string;
}>;

export function SupportLinks({
  locale,
  config,
  contactHref
}: {
  locale: Locale;
  config?: PublicSupportConfig;
  contactHref: `/${Locale}${string}`;
}) {
  if (!config?.hasChannels) return null;

  const t = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'support.contact'
  });

  return (
    <div className="grid gap-2">
      <Link
        href={contactHref}
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
      >
        {t('heading')}
      </Link>
      <ul className="flex flex-wrap gap-2" aria-label={t('heading')}>
        {config.emailHref ? (
          <li>
            <a
              href={config.emailHref}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm font-semibold"
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
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm font-semibold"
            >
              {t('zalo')}
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
