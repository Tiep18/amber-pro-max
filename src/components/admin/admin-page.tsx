import type { HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function AdminPageShell({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main className={cn('grid w-full gap-4 px-4 py-4 sm:px-6 lg:px-8', className)} {...props} />
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  backHref,
  backLabel
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] pb-3">
      <div className="flex min-w-0 items-center gap-3">
        {eyebrow ? (
          <p className="hidden shrink-0 text-xs font-semibold uppercase text-[var(--accent)] xl:block">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="shrink-0 truncate text-xl font-semibold leading-none sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="hidden min-w-0 truncate border-l border-[var(--border)] pl-3 text-sm text-[var(--muted-foreground)] md:block">
            {description}
          </p>
        ) : null}
      </div>
      {action || backHref ? (
        <div className="flex items-center gap-2 shrink-0">
          {backHref ? (
            <Link
              href={backHref}
              className="group inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>{backLabel ?? 'Back'}</span>
            </Link>
          ) : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}

export function AdminMetricCard({
  label,
  value,
  description,
  icon: Icon
}: {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
          ) : null}
        </div>
        {Icon ? <Icon className="size-5 text-[var(--accent)]" aria-hidden="true" /> : null}
      </div>
    </Card>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon ? <Icon className="size-10 text-[var(--accent)]" aria-hidden="true" /> : null}
      <p className="font-semibold">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      ) : null}
    </div>
  );
}

export function AdminStatusPill({
  children,
  tone = 'default'
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    default: 'bg-[var(--surface-muted)] text-[var(--foreground)]',
    success: 'bg-[var(--success-surface)] text-[var(--success)]',
    warning: 'bg-[var(--warning-surface)] text-[var(--warning)]',
    danger: 'bg-[var(--destructive-surface)] text-[var(--destructive)]'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
