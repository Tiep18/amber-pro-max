import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function AdminPageShell({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main className={cn('grid w-full gap-6 px-4 py-6 sm:px-6 lg:px-8', className)} {...props} />
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">{eyebrow}</p>
        <h1 className="text-[28px] font-semibold leading-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {action}
    </div>
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
