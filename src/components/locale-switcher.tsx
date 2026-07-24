'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocalizedRouteSlugs } from '@/components/localized-route-context';
import { getLocaleSwitchHref, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const localeLabels: Record<Locale, string> = {
  vi: 'Tiếng Việt (VI)',
  en: 'English (EN)'
};

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const localizedSlugs = useLocalizedRouteSlugs(pathname);

  return (
    <nav
      aria-label={locale === 'vi' ? 'Ngôn ngữ' : 'Language'}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)]/70 bg-white/45 px-1.5 py-1 text-xs shadow-[inset_0_1px_0_rgb(255_255_255_/_62%)]"
    >
      {(['vi', 'en'] as const).map((target) => {
        const active = target === locale;
        return (
          <Link
            key={target}
            href={getLocaleSwitchHref(pathname, target, searchParams, localizedSlugs)}
            hrefLang={target}
            lang={target}
            aria-label={localeLabels[target]}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2.5 font-semibold tracking-[0.04em] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
              active
                ? 'bg-[var(--surface-paper)] !text-[var(--accent)] shadow-[0_4px_14px_rgb(91_61_35_/_10%)] ring-1 ring-[var(--border)]/60'
                : 'text-[var(--muted-foreground)] hover:bg-white/65 hover:text-[var(--foreground)]'
            )}
          >
            {target.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
