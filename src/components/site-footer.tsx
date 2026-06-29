import {getTranslations} from 'next-intl/server';
import {Suspense} from 'react';
import {type Locale} from '@/i18n/routing';
import {getPublishedRequiredPolicyLinks} from '@/launch/settings';
import {SubscribeForm} from '@/components/newsletter/subscribe-form';
import {LocaleSwitcher} from './locale-switcher';

const policyFallbackLabels = {
  vi: {
    privacy: 'Chinh sach rieng tu',
    terms_of_sale: 'Dieu khoan ban hang',
    returns: 'Chinh sach doi tra',
    digital_downloads: 'Tai ve ky thuat so'
  },
  en: {
    privacy: 'Privacy policy',
    terms_of_sale: 'Terms of sale',
    returns: 'Return policy',
    digital_downloads: 'Digital downloads'
  }
} as const;

function publicPolicyTitle(locale: Locale, policyKind: string, title: string) {
  if (title === 'Vietnamese title' || title === 'English title') {
    return policyFallbackLabels[locale][policyKind as keyof (typeof policyFallbackLabels)['en']] ?? title;
  }
  return title;
}

export async function SiteFooter({locale}: {locale: Locale}) {
  const [t, policyLinks] = await Promise.all([getTranslations('footer'), getPublishedRequiredPolicyLinks(locale)]);

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 text-sm text-[var(--muted-foreground)] sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-10 xl:px-12">
        <SubscribeForm
          locale={locale}
          labels={{
            title: t('newsletter.title'),
            consent: t('newsletter.consent'),
            email: t('newsletter.email'),
            submit: t('newsletter.submit'),
            pending: t('newsletter.pending'),
            success: t('newsletter.success'),
            invalid: t('newsletter.invalid'),
            error: t('newsletter.error')
          }}
        />
        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          {policyLinks.map((policy) => (
            <a key={policy.policyKind} href={policy.href} className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
              {publicPolicyTitle(locale, policy.policyKind, policy.title)}
            </a>
          ))}
          <p>{t('copyright')}</p>
          <Suspense fallback={null}>
            <LocaleSwitcher locale={locale} />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}
