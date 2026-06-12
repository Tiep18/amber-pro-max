import type {HTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

export function Card({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-2', className)} {...props} />;
}

export function CardTitle({className, ...props}: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-xl font-semibold leading-[1.3]', className)} {...props} />;
}

export function CardContent({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-3', className)} {...props} />;
}
