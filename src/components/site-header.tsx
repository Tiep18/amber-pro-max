import {getTranslations} from 'next-intl/server';
import {Suspense} from 'react';
import {getLocalizedPath, type Locale} from '@/i18n/routing';
import {LocaleSwitcher} from './locale-switcher';
import {Sheet} from './ui/sheet';

export async function SiteHeader({locale}: {locale: Locale}) {
  const t = await getTranslations('navigation');

  const links = [
    {href: getLocalizedPath('/', locale), label: t('home')},
    {href: getLocalizedPath('/sign-in', locale), label: t('signIn')}
  ];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:min-h-[72px] lg:px-10 xl:px-12">
        <a href={getLocalizedPath('/', locale)} className="text-xl font-semibold">
          Amigurumi studio
        </a>
        <nav aria-label={t('primary')} className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base hover:bg-[var(--surface-muted)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LocaleSwitcher locale={locale} />
          </Suspense>
          <Sheet triggerLabel={t('openMenu')} title={t('menu')}>
            <nav aria-label={t('primary')} className="flex flex-col gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base hover:bg-[var(--surface-muted)]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
