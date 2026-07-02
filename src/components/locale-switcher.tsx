'use client';

import {usePathname, useSearchParams} from 'next/navigation';
import {getEquivalentLocalizedPath, isLocale, type Locale} from '@/i18n/routing';
import {cn} from '@/lib/utils';

const safeQueryKeys = new Set(['next']);

function safeQuery(searchParams: URLSearchParams) {
  const next = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (safeQueryKeys.has(key) && value.startsWith('/') && !value.startsWith('//')) {
      next.set(key, value);
    }
  }
  const query = next.toString();
  return query ? `?${query}` : '';
}

export function LocaleSwitcher({locale}: {locale: Locale}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)]/70 bg-white/45 px-1.5 py-1 text-xs shadow-[inset_0_1px_0_rgb(255_255_255_/_62%)]"
    >
      {(['vi', 'en'] as const).map((target) => {
        const href =
          isLocale(locale) && target !== locale
            ? `${getEquivalentLocalizedPath(pathname, target)}${safeQuery(searchParams)}`
            : `${pathname}${safeQuery(searchParams)}`;
        const active = target === locale;
        return (
          <a
            key={target}
            href={href}
            aria-label={target === 'vi' ? 'Tieng Viet' : 'English'}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'inline-flex min-h-8 min-w-9 items-center justify-center rounded-full px-2.5 font-semibold tracking-[0.04em] transition duration-200',
              active
                ? 'bg-[var(--surface-paper)] !text-[var(--accent)] shadow-[0_4px_14px_rgb(91_61_35_/_10%)] ring-1 ring-[var(--border)]/60'
                : 'text-[var(--muted-foreground)] hover:bg-white/65 hover:text-[var(--foreground)]'
            )}
          >
            {target.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}
