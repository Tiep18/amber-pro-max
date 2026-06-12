import type {HTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

type AlertVariant = 'default' | 'success' | 'warning' | 'destructive';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const variants: Record<AlertVariant, string> = {
  default: 'border-[var(--border)] bg-[var(--surface)]',
  success: 'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]',
  warning: 'border-[var(--warning)] bg-[var(--warning-surface)] text-[var(--warning)]',
  destructive: 'border-[var(--destructive)] bg-[var(--destructive-surface)] text-[var(--destructive)]'
};

export function Alert({className, variant = 'default', ...props}: AlertProps) {
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn('rounded-[var(--radius-card)] border p-4 text-base', variants[variant], className)}
      {...props}
    />
  );
}

export function AlertTitle({className, ...props}: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold', className)} {...props} />;
}
