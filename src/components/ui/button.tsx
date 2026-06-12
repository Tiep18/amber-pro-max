import type {ButtonHTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
  secondary:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
  ghost: 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
  destructive: 'bg-[var(--destructive)] text-white hover:bg-[#8f1c14]'
};

export function Button({className, variant = 'primary', type = 'button', ...props}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
