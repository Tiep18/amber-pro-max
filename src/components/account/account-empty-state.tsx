import type { ReactNode } from 'react';
import Link from 'next/link';

export function AccountEmptyState({
  icon,
  title,
  body,
  cta
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta?: {
    href: string;
    label: string;
  };
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="mx-auto grid max-w-[360px] justify-items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--accent)]">
          {icon}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{body}</p>
        {cta ? (
          <Link
            href={cta.href}
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {cta.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
