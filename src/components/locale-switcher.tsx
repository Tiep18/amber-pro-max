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
    <nav aria-label="Language" className="inline-flex rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1">
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
              'inline-flex min-h-11 min-w-11 items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-semibold transition-colors',
              active
                ? 'bg-[var(--surface-muted)] text-[var(--accent)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            {target.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}
