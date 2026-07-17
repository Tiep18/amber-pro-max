'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      closeButton
      visibleToasts={4}
      gap={10}
      offset={16}
      mobileOffset={12}
      containerAriaLabel="Admin notifications"
      toastOptions={{
        duration: 4500,
        closeButtonAriaLabel: 'Dismiss notification',
        classNames: {
          toast:
            '!rounded-[var(--radius-card)] !border-[var(--border)] !bg-[var(--surface)] !text-[var(--foreground)] !shadow-[var(--shadow-soft)]',
          title: '!font-semibold',
          description: '!text-[var(--muted-foreground)]',
          closeButton:
            '!border-[var(--border)] !bg-[var(--surface)] !text-[var(--foreground)] hover:!bg-[var(--surface-muted)]',
          success: '!border-[var(--success)] !bg-[var(--success-surface)] !text-[var(--success)]',
          warning: '!border-[var(--warning)] !bg-[var(--warning-surface)] !text-[var(--warning)]',
          error:
            '!border-[var(--destructive)] !bg-[var(--destructive-surface)] !text-[var(--destructive)]',
          info: '!border-[var(--border)] !bg-[var(--surface-muted)] !text-[var(--foreground)]'
        }
      }}
      {...props}
    />
  );
}
